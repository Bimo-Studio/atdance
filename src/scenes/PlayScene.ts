import Phaser from 'phaser';

import { AudioClock } from '@/audio/AudioClock';
import { decodeAudioArrayBuffer } from '@/audio/decodeAudio';
import { decodeAudioFromUrlCached, fetchChartTextCached } from '@/cache/fetchCached';
import { getCalibrationOffsetSec } from '@/calibration/storage';
import { MINIMAL_DANCE_CHART } from '@/chart/fixtures/minimal';
import { buildNoteTimeline } from '@/chart/dance/buildTimeline';
import { parseDanceFile } from '@/chart/dance/parseDance';
import { DEFAULT_RENDER_OPTIONS } from '@/game/buildRenderPlan';
import { buildLaneNotesFromEvents, type LaneIndex, type LaneNote } from '@/game/laneNotes';
import { isMissLateBeat, rateBeatJudge } from '@/judge/beatJudge';
import { isMissLate, rateTimeJudge, type JudgmentGrade, type TimeGrade } from '@/judge/timeJudge';
import type { PlaySceneData } from '@/play/playSceneData';
import { dancePointsIncrement, summarizeDancePoints } from '@/scoring/dancePoints';
import { buildPlayKey, getLocalBest, saveLocalBestIfBetter } from '@/scores/localBest';
import { songIdFromPlaySceneData } from '@/songSelect/songIdFromPlayData';
import { setE2eStatus } from '@/util/e2eFlags';
import { directoryOfUrl } from '@/util/url';

const JUDGESCALE = 1;
const SCROLL_PX_PER_SEC = 280;
const HIT_LINE_Y = 470;
const LANE_CENTER_X: readonly number[] = [120, 280, 440, 600];

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
  private hud!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

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

  constructor() {
    super({ key: 'PlayScene' });
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

    this.graphics = this.add.graphics();
    this.hud = this.add.text(16, 16, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#e8e8f0',
    });
    this.hint = this.add
      .text(480, 32, 'Loading chart…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#8899aa',
      })
      .setOrigin(0.5, 0);

    void this.bootstrap();

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'KeyR') {
        this.scene.start('SongSelectScene');
        return;
      }
      const lane = keyCodeToLane(ev.code);
      if (lane !== null) {
        this.tryHit(lane);
      }
    });

    this.events.once('shutdown', () => {
      try {
        this.bufferSource?.stop();
      } catch {
        /* already finished */
      }
      void this.audioCtx?.close();
      this.audioClock = null;
    });
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
    this.hint.setText(
      `Click to start  •  Arrows = L/D/U/R  •  R = song list  •  judge=${this.judgeMode}  •  add synrg.ogg for audio`,
    );
    void getLocalBest(this.playKey).then((b) => {
      this.localBest = b;
      if (!this.started) {
        this.hint.setText(
          `Click to start  •  local best ${b !== undefined ? String(b) : '—'}  •  Arrows = L/D/U/R  •  R = song list  •  judge=${this.judgeMode}  •  add synrg.ogg for audio`,
        );
      }
    });
    this.input.once('pointerdown', () => {
      void this.beginAudio();
    });
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
    if (this.started) {
      return;
    }
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

    let t0 = this.audioCtx.currentTime;
    let audioOk = false;

    if (this.torrentAudioBuffer) {
      try {
        const buf = await decodeAudioArrayBuffer(this.audioCtx, this.torrentAudioBuffer);
        const src = this.audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(this.audioCtx.destination);
        t0 = this.audioCtx.currentTime;
        src.start(t0);
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
        src.start(t0);
        this.bufferSource = src;
        audioOk = true;
      } catch {
        this.bufferSource = null;
      }
    }

    if (!audioOk) {
      t0 = this.audioCtx.currentTime;
    }

    this.audioStartSec = t0;
    this.started = true;
    setE2eStatus('play-started');
    this.hint.setText(
      audioOk
        ? 'Playing audio — hit notes at the line'
        : 'Silent clock (add .ogg to public/songs/synrg/) — hit notes at the line',
    );
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
    const hit = this.notes.filter((n) => n.state === 'hit').length;
    const missed = this.notes.filter((n) => n.state === 'missed').length;
    const rawT = this.songTimeSec;
    const bestStr = this.localBest !== undefined ? String(this.localBest) : '—';
    this.hud.setText(
      `${this.songLabel}  |  ${this.judgeMode}  |  t=${t.toFixed(2)}s (raw ${rawT.toFixed(2)})  cal=${(this.calOffsetSec * 1000).toFixed(0)}ms\nscore=${this.score}  combo=${this.combo}  last=${this.lastGrade || '—'}  ok=${hit}  miss=${missed}  pending=${pending}  best=${bestStr}`,
    );

    this.graphics.clear();
    this.graphics.lineStyle(2, 0xffffff, 0.35);
    this.graphics.lineBetween(40, HIT_LINE_Y, this.scale.width - 40, HIT_LINE_Y);
    for (const cx of LANE_CENTER_X) {
      this.graphics.lineStyle(1, 0x334455, 0.5);
      this.graphics.lineBetween(cx, 80, cx, this.scale.height - 20);
    }
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
      const x = LANE_CENTER_X[n.lane];
      if (x === undefined) {
        continue;
      }
      this.graphics.fillStyle(0x5cb8ff, 1);
      this.graphics.fillRect(x - 28, y - 14, 56, 28);
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
