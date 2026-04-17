import Phaser from 'phaser';

import { requirePlaySession } from '@/auth/requirePlaySession';
import { AudioClock } from '@/audio/AudioClock';
import { decodeAudioArrayBuffer } from '@/audio/decodeAudio';
import { decodeAudioFromUrlCached, fetchChartTextCached } from '@/cache/fetchCached';
import { getCalibrationOffsetSec } from '@/calibration/storage';
import { MINIMAL_DANCE_CHART } from '@/chart/fixtures/minimal';
import { buildNoteTimeline } from '@/chart/dance/buildTimeline';
import { parseDanceFile } from '@/chart/dance/parseDance';
import { DEFAULT_RENDER_OPTIONS } from '@/game/buildRenderPlan';
import {
  playArrowSparkTextureKey,
  playArrowTextureKey,
  playColorCueTextureKey,
  preloadPlayArrowTextures,
} from '@/game/playArrowAssets';
import { buildLaneNotesFromEvents, type LaneNote } from '@/game/laneNotes';
import type { LaneIndex } from '@/game/types';
import { isMissLateBeat, rateBeatJudge } from '@/judge/beatJudge';
import { isMissLate, rateTimeJudge, type JudgmentGrade, type TimeGrade } from '@/judge/timeJudge';
import { msUntilWallUnixMs, pvpSongTimeAlignment } from '@/play/pvpAudioAlignment';
import { playfieldLayoutForWidth } from '@/play/pvpPlayLayout';
import type { PlaySceneData } from '@/play/playSceneData';
import { dancePointsIncrement, summarizeDancePoints } from '@/scoring/dancePoints';
import { buildPlayKey, getLocalBest, saveLocalBestIfBetter } from '@/scores/localBest';
import { songIdFromPlaySceneData } from '@/songSelect/songIdFromPlayData';
import { getColorCueModeEnabled } from '@/util/colorCueMode';
import { isE2eMode, setE2ePvpPlayLayout, setE2eStatus } from '@/util/e2eFlags';
import { syncAccountMenuForGameScene } from '@/ui/accountMenuHud';
import { directoryOfUrl } from '@/util/url';

const JUDGESCALE = 1;
const SCROLL_PX_PER_SEC = 280;
const HIT_LINE_Y = 470;
/** Scrolling note sprite height (width follows texture aspect). */
const NOTE_H = 56;
/** Receptor sprite height on the hit line (width follows texture aspect). */
const RECEPTOR_H = 76;

const LANE_RECEPTOR_LABELS: readonly string[] = ['Left', 'Down', 'Up', 'Right'];

/** Solo / shared pre-play: auto-start if the player does not tap in time. */
const AUTOSTART_SECONDS = 15;
/** Hold Esc or Q this long to bail to song list (with on-screen countdown). */
const EXIT_HOLD_MS = 5000;

/** Sprite tints (multiply on PNG arrows). */
const RECEPTOR_TINT_IDLE = 0xb8c6d2;
const RECEPTOR_TINT_HELD = 0xffffff;
const NOTE_TINT = 0xc8d4de;

const DEMO_CHART_URL = '/songs/synrg/synrg.dance';

type JudgeMode = 'time' | 'beat';

function keyCodeToLane(code: string): LaneIndex | null {
  switch (code) {
    case 'ArrowLeft':
      return 0;
    case 'ArrowDown':
      return 1;
    case 'ArrowUp':
      return 2;
    case 'ArrowRight':
      return 3;
    default:
      return null;
  }
}

function parseJudgeMode(): JudgeMode {
  const q = new URLSearchParams(window.location.search).get('judge');
  return q === 'beat' ? 'beat' : 'time';
}

function parseChartIndexFromUrl(): number {
  const raw = new URLSearchParams(window.location.search).get('chart');
  const n = raw !== null ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export class PlayScene extends Phaser.Scene {
  private graphics!: Phaser.GameObjects.Graphics;
  /** Lane receptors on the hit line (PNG arrows). */
  private receptorImages: Phaser.GameObjects.Image[] = [];
  /** Pool reused each frame for scrolling note sprites. */
  private noteImagePool: Phaser.GameObjects.Image[] = [];
  private notePoolIndex = 0;
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  /** PvP: opponent summary (G7 minimal strip). */
  private peerHud: Phaser.GameObjects.Text | null = null;
  /** L, D, U, R lane centers — set in `create` from {@link playfieldLayoutForWidth}. */
  private laneCenterX: readonly number[] = [];
  private playfieldRightX = 0;
  private pvpSplitDividerX: number | null = null;

  private notes: LaneNote[] = [];
  private audioCtx: AudioContext | null = null;
  private audioClock: AudioClock | null = null;
  private audioStartSec = 0;
  private started = false;
  private bufferSource: AudioBufferSourceNode | null = null;

  private score = 0;
  private combo = 0;
  private lastGrade = '';
  private readonly calOffsetSec = getCalibrationOffsetSec();
  private lastNoteTimeSec = 0;
  private bpm = 120;
  private songLabel = 'demo';
  private audioUrl: string | null = null;
  /** When set, audio decodes from this buffer instead of `audioUrl`. */
  private torrentAudioBuffer: ArrayBuffer | null = null;
  private readonly judgeMode: JudgeMode = parseJudgeMode();
  private playData: PlaySceneData = {};
  private chartReady = false;
  private playKey = '';
  private localBest: number | undefined;
  private doneScoreSaved = false;
  /** Prevents overlapping beginAudio; pointer/Space can fire before async work finishes. */
  private audioStartPending = false;
  private lastPvpScoreTickMs = 0;
  /** Browser `setInterval` id (number in DOM lib). */
  private autostartIntervalId: number | null = null;
  private autostartSecondsRemaining = 0;
  /** `performance.now()` when key went down (window capture — reliable vs Phaser Key.duration). */
  private escHoldSince: number | null = null;
  private qHoldSince: number | null = null;
  private exitHoldLatch = false;
  private exitHoldHud!: Phaser.GameObjects.Text;
  /** Lane order: Left, Down, Up, Right — same as {@link keyCodeToLane}. */
  private laneKeys: Phaser.Input.Keyboard.Key[] = [];

  private readonly onWindowKeyDown = (ev: KeyboardEvent): void => {
    if (ev.repeat) {
      return;
    }
    if (ev.code === 'Escape') {
      this.escHoldSince = performance.now();
      ev.preventDefault();
    } else if (ev.code === 'KeyQ') {
      this.qHoldSince = performance.now();
    }
  };

  private readonly onWindowKeyUp = (ev: KeyboardEvent): void => {
    if (ev.code === 'Escape') {
      this.escHoldSince = null;
    } else if (ev.code === 'KeyQ') {
      this.qHoldSince = null;
    }
  };

  constructor() {
    super({ key: 'PlayScene' });
  }

  preload(): void {
    preloadPlayArrowTextures(this);
  }

  init(data?: PlaySceneData): void {
    this.playData = data ?? {};
  }

  private get selectedChartIndex(): number {
    if (this.playData.chartIndex !== undefined) {
      return this.playData.chartIndex;
    }
    return parseChartIndexFromUrl();
  }

  create(): void {
    syncAccountMenuForGameScene(this.scene.key);
    if (!requirePlaySession(this)) {
      return;
    }
    this.score = 0;
    this.combo = 0;
    this.lastGrade = '';
    this.started = false;
    this.chartReady = false;
    this.doneScoreSaved = false;
    this.notes = [];
    this.audioUrl = null;
    this.torrentAudioBuffer = null;
    this.playKey = '';
    this.localBest = undefined;
    this.audioClock = null;
    this.peerHud = null;
    this.lastPvpScoreTickMs = 0;
    this.autostartIntervalId = null;
    this.autostartSecondsRemaining = 0;
    this.exitHoldLatch = false;
    this.escHoldSince = null;
    this.qHoldSince = null;

    const pvpPanel = this.playData.pvp?.remoteHudRef !== undefined;
    const layout = playfieldLayoutForWidth(this.scale.width, pvpPanel);
    this.laneCenterX = layout.laneCenters;
    this.playfieldRightX = layout.playfieldRightX;
    this.pvpSplitDividerX = layout.splitDividerX;

    this.graphics = this.add.graphics();
    /** Above default (0) so lane labels / playfield paint is visible; HUD stays higher. */
    this.graphics.setDepth(10);

    this.receptorImages = [];
    for (let lane = 0; lane < 4; lane += 1) {
      const cx = this.laneCenterX[lane];
      if (cx === undefined) {
        throw new Error('PlayScene: expected four lane centers');
      }
      const key = playArrowTextureKey(lane as LaneIndex, 0);
      const img = this.add.image(cx, HIT_LINE_Y, key);
      img.setOrigin(0.5, 0.5);
      img.setDepth(12);
      img.setScale(RECEPTOR_H / img.height);
      img.setTint(RECEPTOR_TINT_IDLE);
      this.receptorImages.push(img);
    }

    this.noteImagePool = [];
    this.notePoolIndex = 0;
    this.ensureNoteImagePool(56);

    const labelY = HIT_LINE_Y + RECEPTOR_H / 2 + 8;
    for (let i = 0; i < 4; i += 1) {
      const cx = this.laneCenterX[i];
      const lab = LANE_RECEPTOR_LABELS[i];
      if (cx === undefined || lab === undefined) {
        continue;
      }
      this.add
        .text(cx, labelY, lab, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: '#a8b8c8',
          align: 'center',
        })
        .setOrigin(0.5, 0)
        .setDepth(15);
    }

    this.hud = this.add.text(16, 16, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#e8e8f0',
    });
    this.hud.setDepth(100);
    if (pvpPanel && this.pvpSplitDividerX !== null) {
      const wrap = Math.max(120, this.scale.width - this.pvpSplitDividerX - 20);
      this.peerHud = this.add
        .text(this.pvpSplitDividerX + 14, 68, 'Opponent\n…', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          color: '#9ab8d8',
          lineSpacing: 4,
          wordWrap: { width: wrap },
        })
        .setOrigin(0, 0);
      this.peerHud.setDepth(100);
    }
    const hintCx = (this.laneCenterX[0]! + this.laneCenterX[3]!) / 2;
    this.hint = this.add
      .text(hintCx, 56, 'Loading chart…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#aab8c8',
        align: 'center',
      })
      .setOrigin(0.5, 0);
    this.hint.setDepth(100);

    this.exitHoldHud = this.add
      .text(this.scale.width / 2, this.scale.height - 20, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#d4b87a',
        align: 'center',
      })
      .setOrigin(0.5, 1);
    this.exitHoldHud.setDepth(120);

    window.addEventListener('keydown', this.onWindowKeyDown, true);
    window.addEventListener('keyup', this.onWindowKeyUp, true);

    const kb = this.input.keyboard!;
    this.laneKeys = [
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    ];

    void this.bootstrap();

    const tryStart = (): void => {
      if (!this.chartReady || this.started || this.audioStartPending) {
        return;
      }
      this.cancelAutostart();
      void this.beginAudio();
    };
    this.input.on('pointerdown', tryStart);
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'Space') {
        ev.preventDefault();
        tryStart();
        return;
      }
      if (ev.code === 'KeyR') {
        this.cancelAutostart();
        this.scene.start('SongSelectScene');
        return;
      }
      const lane = keyCodeToLane(ev.code);
      if (lane !== null) {
        this.tryHit(lane);
      }
    });

    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', this.onWindowKeyDown, true);
      window.removeEventListener('keyup', this.onWindowKeyUp, true);
      this.cancelAutostart();
      try {
        this.bufferSource?.stop();
      } catch {
        /* already finished */
      }
      void this.audioCtx?.close();
      this.audioClock = null;
      this.playData.pvp?.closeRelay?.();
    });
  }

  private cancelAutostart(): void {
    if (this.autostartIntervalId !== null) {
      clearInterval(this.autostartIntervalId);
      this.autostartIntervalId = null;
    }
  }

  private ensureNoteImagePool(capacity: number): void {
    while (this.noteImagePool.length < capacity) {
      const img = this.add.image(-9999, -9999, playArrowTextureKey(0, 0));
      img.setOrigin(0.5, 0.5);
      img.setDepth(11);
      img.setVisible(false);
      this.noteImagePool.push(img);
    }
  }

  private reuseNoteSprite(lane: LaneIndex, x: number, y: number, variant: number): void {
    this.ensureNoteImagePool(this.notePoolIndex + 1);
    const img = this.noteImagePool[this.notePoolIndex]!;
    this.notePoolIndex += 1;
    img.setVisible(true);
    if (getColorCueModeEnabled()) {
      img.setTexture(playColorCueTextureKey(lane, variant));
      img.clearTint();
    } else {
      img.setTexture(playArrowTextureKey(lane, variant));
      img.setTint(NOTE_TINT);
    }
    img.setPosition(x, y);
    img.setScale(NOTE_H / img.height);
  }

  /** Pre-play countdown + instructions (skipped when PvP lobby already auto-starts audio). */
  private scheduleAutostart(): void {
    this.cancelAutostart();
    if (this.playData.pvp?.autoStartAudio) {
      return;
    }
    this.autostartSecondsRemaining = AUTOSTART_SECONDS;
    this.refreshPreStartHint();
    this.autostartIntervalId = window.setInterval(() => {
      if (!this.scene.isActive() || this.started || !this.chartReady) {
        this.cancelAutostart();
        return;
      }
      this.autostartSecondsRemaining -= 1;
      if (this.autostartSecondsRemaining <= 0) {
        this.cancelAutostart();
        void this.beginAudio();
        return;
      }
      this.refreshPreStartHint();
    }, 1000);
  }

  private refreshPreStartHint(): void {
    if (this.started || !this.chartReady) {
      return;
    }
    const best = this.localBest !== undefined ? String(this.localBest) : '—';
    const n = Math.max(0, this.autostartSecondsRemaining);
    this.hint.setText(
      `Click or press Space when ready — starting in ${n}s\nHold Esc or Q for ${Math.round(EXIT_HOLD_MS / 1000)}s to exit · R quick exit · best ${best}`,
    );
  }

  private tryExitEarlyByHold(): void {
    const now = performance.now();
    const escHeldMs = this.escHoldSince !== null ? now - this.escHoldSince : 0;
    const qHeldMs = this.qHoldSince !== null ? now - this.qHoldSince : 0;
    const heldMs = Math.max(escHeldMs, qHeldMs);
    const holding = this.escHoldSince !== null || this.qHoldSince !== null;

    if (holding && heldMs >= EXIT_HOLD_MS) {
      if (!this.exitHoldLatch) {
        this.exitHoldLatch = true;
        this.exitHoldHud.setText('');
        this.cancelAutostart();
        this.scene.start('SongSelectScene');
      }
      return;
    }

    if (!holding) {
      this.exitHoldLatch = false;
      this.exitHoldHud.setText('');
      return;
    }

    const remainSec = Math.max(1, Math.ceil((EXIT_HOLD_MS - heldMs) / 1000));
    this.exitHoldHud.setText(`Exit to song list — keep holding Esc or Q (${remainSec}s)`);
  }

  private async bootstrap(): Promise<void> {
    let chartText = MINIMAL_DANCE_CHART;
    let usedTorrent = false;
    this.torrentAudioBuffer = null;

    if (this.playData.magnetUri) {
      this.hint.setText('Loading torrent… (magnet)');
      try {
        const mod = await import('@/torrent/wireWebTorrent');
        const r = await mod.loadSongFromMagnetUri(
          this.playData.magnetUri,
          this.playData.torrentTimeoutMs ?? 45000,
        );
        chartText = r.chartText;
        this.torrentAudioBuffer = r.audioBuffer;
        usedTorrent = true;
        this.hint.setText('Torrent ready — parsing chart…');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.hint.setText(`Torrent failed (${msg}). Trying HTTP fallback…`);
      }
    }

    if (!usedTorrent) {
      if (this.playData.useMinimal) {
        chartText = MINIMAL_DANCE_CHART;
      } else {
        const url = this.playData.chartUrl ?? DEMO_CHART_URL;
        this.hint.setText('Fetching chart…');
        try {
          chartText = await fetchChartTextCached(url);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.hint.setText(
            `Chart fetch failed: ${msg}\nUsing minimal fixture — check network / path.`,
          );
          chartText = MINIMAL_DANCE_CHART;
        }
      }
    }

    this.hint.setText('Parsing chart…');

    try {
      const { charts } = parseDanceFile(chartText);
      const idx = Math.min(this.selectedChartIndex, Math.max(0, charts.length - 1));
      const chart = charts[idx];
      if (!chart) {
        throw new Error('No chart');
      }
      const tl = buildNoteTimeline(chart);
      this.notes = buildLaneNotesFromEvents(tl.noteEvents, DEFAULT_RENDER_OPTIONS);
      this.lastNoteTimeSec = this.notes.reduce((m, n) => Math.max(m, n.timeSec), 0);
      this.bpm = tl.bpm;
      this.playKey = buildPlayKey(this.playData, idx);
      this.songLabel = `${chart.metadata.title ?? 'Song'} · ${chart.difficultyName}`;
      const fn = chart.metadata.filename?.trim();
      if (this.torrentAudioBuffer) {
        this.audioUrl = null;
      } else if (fn && fn.toLowerCase() !== 'dummy.ogg') {
        const base = fn.includes('/') ? fn.slice(fn.lastIndexOf('/') + 1) : fn;
        const chartUrlForAudio = this.playData.useMinimal
          ? null
          : (this.playData.chartUrl ?? DEMO_CHART_URL);
        const dir = chartUrlForAudio ? directoryOfUrl(chartUrlForAudio) : '';
        this.audioUrl = dir ? `${dir}/${base}` : null;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.hint.setText(`Chart error: ${msg}`);
      return;
    }

    this.chartReady = true;
    setE2eStatus('play-ready');
    if (isE2eMode()) {
      setE2ePvpPlayLayout(this.playData.pvp?.remoteHudRef !== undefined ? 'split' : 'solo');
    }
    void getLocalBest(this.playKey).then((b) => {
      this.localBest = b;
      if (!this.started) {
        this.refreshPreStartHint();
      }
    });

    if (this.playData.pvp?.autoStartAudio) {
      void this.beginAudio();
    } else {
      this.scheduleAutostart();
    }
  }

  private rate(offsetSec: number): TimeGrade | null {
    return this.judgeMode === 'beat'
      ? rateBeatJudge(offsetSec, JUDGESCALE, this.bpm)
      : rateTimeJudge(offsetSec, JUDGESCALE);
  }

  private miss(songTimeSec: number, noteTimeSec: number): boolean {
    return this.judgeMode === 'beat'
      ? isMissLateBeat(songTimeSec, noteTimeSec, JUDGESCALE, this.bpm)
      : isMissLate(songTimeSec, noteTimeSec, JUDGESCALE);
  }

  private async beginAudio(): Promise<void> {
    if (!this.chartReady) {
      return;
    }
    if (this.started || this.audioStartPending) {
      return;
    }
    this.cancelAutostart();
    this.audioStartPending = true;
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        this.hint.setText('Web Audio not available');
        return;
      }
      this.hint.setText('Loading audio…');
      this.audioCtx = new Ctx();
      this.audioClock = new AudioClock(this.audioCtx);
      await this.audioCtx.resume();
      // Suspended context freezes currentTime → song time stays 0 → no scroll cues and no audible clock.
      if (this.audioCtx.state !== 'running') {
        void this.audioCtx.close();
        this.audioCtx = null;
        this.audioClock = null;
        this.hint.setText('Audio still blocked — click the game canvas (not just Space) to unlock');
        return;
      }

      const agreed = this.playData.pvp?.agreedStartAtUnixMs;
      if (agreed !== undefined) {
        const waitMs = msUntilWallUnixMs(agreed, Date.now());
        if (waitMs > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
        }
      }

      let t0 = this.audioCtx.currentTime;
      let audioOk = false;
      let audioStartSec = t0;

      if (this.torrentAudioBuffer) {
        try {
          const buf = await decodeAudioArrayBuffer(this.audioCtx, this.torrentAudioBuffer);
          const src = this.audioCtx.createBufferSource();
          src.buffer = buf;
          src.connect(this.audioCtx.destination);
          t0 = this.audioCtx.currentTime;
          const wantOffset =
            agreed !== undefined ? pvpSongTimeAlignment(agreed, Date.now(), t0).bufferOffsetSec : 0;
          const offset = Math.min(wantOffset, Math.max(0, buf.duration - 0.001));
          src.start(t0, offset);
          audioStartSec = t0 - offset;
          this.bufferSource = src;
          audioOk = true;
        } catch {
          this.bufferSource = null;
        }
      } else if (this.audioUrl) {
        try {
          const buf = await decodeAudioFromUrlCached(this.audioCtx, this.audioUrl);
          const src = this.audioCtx.createBufferSource();
          src.buffer = buf;
          src.connect(this.audioCtx.destination);
          t0 = this.audioCtx.currentTime;
          const wantOffset =
            agreed !== undefined ? pvpSongTimeAlignment(agreed, Date.now(), t0).bufferOffsetSec : 0;
          const offset = Math.min(wantOffset, Math.max(0, buf.duration - 0.001));
          src.start(t0, offset);
          audioStartSec = t0 - offset;
          this.bufferSource = src;
          audioOk = true;
        } catch {
          this.bufferSource = null;
        }
      }

      if (!audioOk) {
        t0 = this.audioCtx.currentTime;
        audioStartSec =
          agreed !== undefined ? pvpSongTimeAlignment(agreed, Date.now(), t0).audioStartSec : t0;
      }

      this.audioStartSec = audioStartSec;
      this.started = true;
      setE2eStatus('play-started');
      const silentHint = audioOk
        ? 'Hit notes when cues meet the line (←↓↑→)'
        : 'Silent timing — no audio file decoded. Hit notes when cues meet the line.';
      this.hint.setText(silentHint);
    } finally {
      this.audioStartPending = false;
    }
  }

  private get songTimeSec(): number {
    if (!this.started || !this.audioClock) {
      return 0;
    }
    return this.audioClock.currentTimeSeconds - this.audioStartSec;
  }

  /** Chart time aligned to perceived beat (subtract calibration when taps are late). */
  private get effectiveSongTimeSec(): number {
    return this.songTimeSec - this.calOffsetSec;
  }

  private tryHit(lane: LaneIndex): void {
    if (!this.started) {
      return;
    }
    const t = this.effectiveSongTimeSec;
    let best: LaneNote | null = null;
    let bestAbs = Infinity;
    for (const n of this.notes) {
      if (n.state !== 'pending' || n.lane !== lane) {
        continue;
      }
      const d = t - n.timeSec;
      if (this.rate(d) !== null) {
        const ad = Math.abs(d);
        if (ad < bestAbs) {
          bestAbs = ad;
          best = n;
        }
      }
    }
    if (best) {
      best.state = 'hit';
      best.grade = this.rate(t - best.timeSec)!;
      this.score += dancePointsIncrement(best.grade);
      this.combo += 1;
      this.lastGrade = best.grade;
    }
  }

  update(): void {
    this.tryExitEarlyByHold();

    const t = this.effectiveSongTimeSec;
    let anyMiss = false;
    for (const n of this.notes) {
      if (n.state === 'pending' && this.miss(t, n.timeSec)) {
        n.state = 'missed';
        anyMiss = true;
      }
    }
    if (anyMiss) {
      this.combo = 0;
    }

    const pending = this.notes.filter((n) => n.state === 'pending').length;
    const missed = this.notes.filter((n) => n.state === 'missed').length;
    const bestStr = this.localBest !== undefined ? String(this.localBest) : '—';
    const titleShort =
      this.songLabel.length > 42 ? `${this.songLabel.slice(0, 40)}…` : this.songLabel;
    this.hud.setFontSize(this.started ? '16px' : '15px');
    if (this.started) {
      this.hud.setText(
        `${titleShort}\nScore ${this.score}  ·  Combo ${this.combo}  ·  ${this.lastGrade || '—'}  ·  best ${bestStr}`,
      );
    } else {
      this.hud.setText(titleShort);
    }

    const peerRef = this.playData.pvp?.remoteHudRef;
    if (this.peerHud !== null && peerRef !== undefined) {
      this.peerHud.setText(
        `Opponent\nscore ${peerRef.score}\ncombo ${peerRef.combo}\nmiss ${peerRef.miss}`,
      );
    }

    const sendPvp = this.playData.pvp?.sendPvp;
    if (this.started && sendPvp !== undefined) {
      const now = Date.now();
      if (now - this.lastPvpScoreTickMs >= 200) {
        this.lastPvpScoreTickMs = now;
        sendPvp({
          type: 'pvp.v1.scoreTick',
          combo: this.combo,
          miss: missed,
          score: this.score,
        });
      }
    }

    this.graphics.clear();
    this.graphics.lineStyle(2, 0xffffff, 0.25);
    this.graphics.lineBetween(40, HIT_LINE_Y, this.playfieldRightX, HIT_LINE_Y);
    if (this.pvpSplitDividerX !== null) {
      this.graphics.lineStyle(2, 0x556677, 0.45);
      this.graphics.lineBetween(
        this.pvpSplitDividerX,
        56,
        this.pvpSplitDividerX,
        this.scale.height - 28,
      );
    }

    for (let lane = 0; lane < 4; lane += 1) {
      const cx = this.laneCenterX[lane];
      const img = this.receptorImages[lane];
      if (cx === undefined || img === undefined) {
        continue;
      }
      img.setPosition(cx, HIT_LINE_Y);
      const laneKey = this.laneKeys[lane];
      const held = laneKey?.isDown ?? false;
      const variant = 0;
      if (held) {
        img.setTexture(playArrowSparkTextureKey(lane as LaneIndex, variant));
        img.setTint(RECEPTOR_TINT_HELD);
      } else {
        img.setTexture(playArrowTextureKey(lane as LaneIndex, variant));
        img.setTint(RECEPTOR_TINT_IDLE);
      }
      img.setScale(RECEPTOR_H / img.height);
    }

    for (const cx of this.laneCenterX) {
      this.graphics.lineStyle(1, 0x334455, 0.45);
      this.graphics.lineBetween(cx, 80, cx, this.scale.height - 20);
    }

    this.notePoolIndex = 0;
    for (const n of this.notes) {
      if (n.state !== 'pending') {
        continue;
      }
      if (t < n.scrollAppearanceTimeSec) {
        continue;
      }
      const y = HIT_LINE_Y - (n.timeSec - t) * SCROLL_PX_PER_SEC; // t = effective song time
      if (y < -40 || y > this.scale.height + 40) {
        continue;
      }
      const x = this.laneCenterX[n.lane];
      if (x === undefined) {
        continue;
      }
      const variant = Math.abs(Math.floor(n.timeSec * 12 + n.lane * 5)) % 4;
      this.reuseNoteSprite(n.lane, x, y, variant);
    }
    for (let i = this.notePoolIndex; i < this.noteImagePool.length; i += 1) {
      this.noteImagePool[i]!.setVisible(false);
    }

    if (this.started && pending === 0 && t > this.lastNoteTimeSec + 0.75) {
      if (!this.doneScoreSaved) {
        this.doneScoreSaved = true;
        const ordered = [...this.notes].sort((a, b) => a.timeSec - b.timeSec);
        const grades: JudgmentGrade[] = ordered.map((n) =>
          n.state === 'hit' && n.grade ? n.grade : 'M',
        );
        const summary = summarizeDancePoints(grades, false);
        void saveLocalBestIfBetter(this.playKey, summary.score).then((best) => {
          this.localBest = best;
        });
        this.scene.start('ResultsScene', {
          songLabel: this.songLabel,
          summary,
          playKey: this.playKey,
          songId: songIdFromPlaySceneData(this.playData),
        });
      }
    }
  }
}
