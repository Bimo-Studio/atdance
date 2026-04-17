import Phaser from 'phaser';

export interface AcknowledgementsSceneData {
  backSceneKey?: string;
}

const CREDIT_LINES = [
  'ACKNOWLEDGEMENTS',
  '',
  'ATDance stands on the shoulders of free software, open protocols,',
  'and the people who maintain them.',
  '',
  '— DEPENDENCIES —',
  'Phaser · Vite · TypeScript',
  'Vitest · Playwright · ESLint · Prettier',
  'ATProto / OAuth client bits in-repo',
  'WebTorrent · Hyperswarm · related P2P glue',
  'timidity (WebAssembly) · FreePats — background music in this scene',
  '',
  '— TOOLING & TESTS —',
  'pnpm · Git · GitHub Actions',
  'Unit tests, typecheck, lint — thank you',
  'to everyone who files good bug reports.',
  '',
  '— ECOSYSTEM —',
  'The Bluesky / AT Protocol community',
  'for public AppView + identity endpoints.',
  'BitMidi-era culture: keep MIDI weird.',
  '',
  '— TRANSITIVE STACKS —',
  'Emscripten · Web Audio · WASM runtimes',
  'Browsers, TLS, CDNs, and the endless',
  'depth of npm — we ship a slice, not the whole iceberg.',
  '',
] as const;

const PYDANCE_LINES = [
  '— PYDANCE —',
  'Huge love to pydance and the StepMania lineage:',
  'arrow charts, timing windows, and living room pads',
  'long before streams and DIDs.',
  'This scene is for you.',
] as const;

const TAIL_LINES = ['', 'Thank you for playing.'] as const;

const FANFARE_GLYPHS = ['\u2764\uFE0F', '\uD83C\uDF08', '\uD83C\uDF55'] as const;

const SCROLL_PX_PER_SEC = 18;
const SMALL_PX = 11;
/** Slightly under 3× body size so Press Start 2P fits the playfield width */
const PYDANCE_PX = Math.round(SMALL_PX * 2.45);
const SECTION_GAP = 16;
/** Pixels/sec² — downward acceleration in screen space */
const FW_GRAVITY = 480;
const FW_LAUNCH_SPEED = 560;
const FW_SPARK_SPEED_MIN = 120;
const FW_SPARK_SPEED_MAX = 320;
const FW_SPARK_LIFE = 1.35;

interface TimidityPlayer {
  play: () => void;
  load: (u: string) => Promise<void>;
  destroy: () => void;
  on: (ev: string, fn: (err: unknown) => void) => void;
}

interface FwParticle {
  go: Phaser.GameObjects.Text;
  vx: number;
  vy: number;
  life: number;
  drag: number;
}

interface FwRocket {
  go: Phaser.GameObjects.Text;
  vx: number;
  vy: number;
  glyph: string;
  exploded: boolean;
  /** Burst when rocket center crosses this Y (screen space, top = 0) while rising */
  burstY: number;
}

/**
 * Scrolling credits + optional MIDI bed (timidity). R / ESC → back.
 */
export class AcknowledgementsScene extends Phaser.Scene {
  private backSceneKey = 'TitleScene';
  private creditsRoot!: Phaser.GameObjects.Container;
  private readonly scrollSpeedPxPerSec = SCROLL_PX_PER_SEC;
  private scrollAccumPx = 0;
  private fireworksActive = false;
  private fireworkSpawnTimer: Phaser.Time.TimerEvent | null = null;
  private timidityPlayer: TimidityPlayer | null = null;
  private fwRockets: FwRocket[] = [];
  private fwParticles: FwParticle[] = [];

  constructor() {
    super({ key: 'AcknowledgementsScene' });
  }

  init(data: AcknowledgementsSceneData): void {
    this.backSceneKey = data?.backSceneKey ?? 'TitleScene';
  }

  create(): void {
    this.add
      .text(this.scale.width / 2, 28, 'Credits', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5);

    const smallStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: `${SMALL_PX}px`,
      color: '#b8d4ee',
      align: 'center',
      lineSpacing: 6,
    };
    const wrapW = Math.max(120, this.scale.width - 64);
    const pydStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      ...smallStyle,
      fontSize: `${PYDANCE_PX}px`,
      lineSpacing: 10,
      color: '#ddeeff',
      wordWrap: { width: wrapW, useAdvancedWrap: true },
    };

    const headText = this.add
      .text(0, 0, [...CREDIT_LINES].join('\n'), smallStyle)
      .setOrigin(0.5, 0);
    let y = headText.height + SECTION_GAP;
    const pydText = this.add.text(0, y, [...PYDANCE_LINES].join('\n'), pydStyle).setOrigin(0.5, 0);
    y += pydText.height + SECTION_GAP;
    const tailText = this.add.text(0, y, [...TAIL_LINES].join('\n'), smallStyle).setOrigin(0.5, 0);

    this.creditsRoot = this.add.container(this.scale.width / 2, this.scale.height + 80, [
      headText,
      pydText,
      tailText,
    ]);
    this.creditsRoot.setDepth(0);

    this.add
      .text(this.scale.width / 2, this.scale.height - 20, 'R or ESC — back · tap if no music', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#667788',
      })
      .setOrigin(0.5, 1);

    this.input.on('pointerdown', () => {
      void this.nudgeMidi();
    });

    void this.startMidi();

    const goBack = (): void => {
      this.scene.start(this.backSceneKey);
    };
    this.input.keyboard?.once('keydown-KeyR', goBack);
    this.input.keyboard?.once('keydown-ESC', goBack);

    this.events.once('shutdown', () => {
      this.fireworkSpawnTimer?.destroy();
      this.fireworkSpawnTimer = null;
      for (const r of this.fwRockets) {
        r.go.destroy();
      }
      this.fwRockets = [];
      for (const p of this.fwParticles) {
        p.go.destroy();
      }
      this.fwParticles = [];
      this.timidityPlayer?.destroy();
      this.timidityPlayer = null;
    });
  }

  update(_t: number, dt: number): void {
    const dtSec = dt / 1000;
    const dy = this.scrollSpeedPxPerSec * dtSec;
    this.creditsRoot.y -= dy;
    this.scrollAccumPx += dy;

    const bounds = this.creditsRoot.getBounds();
    if (bounds.bottom < -40) {
      this.creditsRoot.y = this.scale.height + 60;
    }

    if (!this.fireworksActive && this.scrollAccumPx > 1200) {
      this.fireworksActive = true;
      this.startFireworkLoop();
    }

    this.stepFireworks(dtSec);
  }

  private startFireworkLoop(): void {
    const spawn = (): void => {
      this.spawnFireworkRocket();
      const next = Phaser.Math.Between(320, 900);
      this.fireworkSpawnTimer?.destroy();
      this.fireworkSpawnTimer = this.time.delayedCall(next, spawn);
    };
    spawn();
  }

  private pickGlyph(): string {
    const i = Phaser.Math.Between(0, FANFARE_GLYPHS.length - 1);
    return FANFARE_GLYPHS[i] ?? FANFARE_GLYPHS[0];
  }

  private spawnFireworkRocket(): void {
    const glyph = this.pickGlyph();
    const w = this.scale.width;
    const H = this.scale.height;
    const x0 = w * Phaser.Math.FloatBetween(0.12, 0.88);
    const y0 = H + 36;
    /** ~2/3 up from bottom of view is y ~= H/3; overshoot = smaller Y, undershoot = larger Y */
    const nominal = H * (1 / 3);
    const burstY = Phaser.Math.Clamp(
      nominal + Phaser.Math.FloatBetween(-0.16 * H, 0.16 * H),
      H * 0.08,
      H * 0.62,
    );
    /** vx = cos(θ), vy = sin(θ); θ in (-π, 0) => vy < 0 (up). Narrow old range skewed up-left. */
    const straightUp = Math.random() < 0.03;
    const angleWideMin = -Math.PI + 0.18;
    const angleWideMax = -0.32;
    const angle = straightUp
      ? Phaser.Math.FloatBetween(-Math.PI / 2 - 0.06, -Math.PI / 2 + 0.06)
      : Phaser.Math.FloatBetween(angleWideMin, angleWideMax);
    const speed = Phaser.Math.FloatBetween(FW_LAUNCH_SPEED * 0.92, FW_LAUNCH_SPEED * 1.18);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const go = this.add
      .text(x0, y0, glyph, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(50);

    this.fwRockets.push({ go, vx, vy, glyph, exploded: false, burstY });
  }

  private burstFirework(x: number, y: number, glyph: string): void {
    const count = Phaser.Math.Between(18, 32);
    for (let i = 0; i < count; i++) {
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const sp = Phaser.Math.FloatBetween(FW_SPARK_SPEED_MIN, FW_SPARK_SPEED_MAX);
      const vx = Math.cos(a) * sp;
      const vy = Math.sin(a) * sp * Phaser.Math.FloatBetween(0.55, 1.05);
      const size = Phaser.Math.Between(14, 26);
      const go = this.add
        .text(x, y, glyph, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: `${size}px`,
        })
        .setOrigin(0.5, 0.5)
        .setDepth(49)
        .setAlpha(0.95);

      this.fwParticles.push({
        go,
        vx,
        vy,
        life: FW_SPARK_LIFE * Phaser.Math.FloatBetween(0.75, 1.15),
        drag: Phaser.Math.FloatBetween(0.96, 0.995),
      });
    }
  }

  private stepFireworks(dtSec: number): void {
    const g = FW_GRAVITY;

    for (const r of this.fwRockets) {
      if (r.exploded) {
        continue;
      }
      r.vy += g * dtSec;
      r.go.x += r.vx * dtSec;
      r.go.y += r.vy * dtSec;

      const crossedLineWhileRising = r.vy < 0 && r.go.y <= r.burstY;
      const pastApex = r.vy >= 0;
      if (crossedLineWhileRising || pastApex) {
        r.exploded = true;
        this.burstFirework(r.go.x, r.go.y, r.glyph);
        r.go.destroy();
      } else if (
        r.go.y > this.scale.height + 80 ||
        r.go.x < -60 ||
        r.go.x > this.scale.width + 60
      ) {
        r.exploded = true;
        r.go.destroy();
      }
    }
    this.fwRockets = this.fwRockets.filter((r) => !r.exploded);

    for (const p of this.fwParticles) {
      p.vy += g * dtSec;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.go.x += p.vx * dtSec;
      p.go.y += p.vy * dtSec;
      p.life -= dtSec;
      p.go.setAlpha(Math.max(0, p.life / FW_SPARK_LIFE));
    }
    this.fwParticles = this.fwParticles.filter((p) => {
      if (p.life <= 0) {
        p.go.destroy();
        return false;
      }
      return true;
    });
  }

  private async nudgeMidi(): Promise<void> {
    const p = this.timidityPlayer;
    if (!p) {
      return;
    }
    const ctx = (p as unknown as { _audioContext?: AudioContext })._audioContext;
    try {
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
      p.play();
    } catch {
      /* ignore */
    }
  }

  private async startMidi(): Promise<void> {
    const trace = (step: string, detail?: unknown): void => {
      if (import.meta.env.DEV) {
        console.info(`[AcknowledgementsScene] midi:${step}`, detail ?? '');
      }
    };
    try {
      trace('import timidity');
      const { default: Timidity } = await import('timidity');
      const basePath = `${window.location.origin}${import.meta.env.BASE_URL}midi-engine/`;
      const midiBase = `${window.location.origin}${import.meta.env.BASE_URL}midi/`;
      const manifestUrl = `${midiBase}midi-manifest.json`;
      trace('fetch manifest', { manifestUrl });
      const manRes = await fetch(manifestUrl);
      if (!manRes.ok) {
        throw new Error(`midi-manifest.json HTTP ${manRes.status}`);
      }
      const manifest = (await manRes.json()) as { tracks?: string[] };
      const tracks = (manifest.tracks ?? []).filter(
        (t) => t !== '' && !t.includes('/') && t.toLowerCase() !== 'credits.mid',
      );
      if (tracks.length === 0) {
        trace('no tracks in midi manifest');
        return;
      }
      const pick = tracks[Math.floor(Math.random() * tracks.length)]!;
      const midiUrl = `${midiBase}${encodeURIComponent(pick)}`;
      trace('paths', { basePath, midiUrl, pick, trackCount: tracks.length });
      const player = new Timidity(basePath) as unknown as TimidityPlayer;
      this.timidityPlayer = player;

      player.on('error', (err) => {
        trace('timidity error event', err);
        if (import.meta.env.DEV) {
          console.warn('[AcknowledgementsScene] timidity error', err);
        }
      });

      const ctx = (player as unknown as { _audioContext?: AudioContext })._audioContext;
      trace('AudioContext after construct', { state: ctx?.state });
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume().catch(() => undefined);
        trace('resume after construct', { state: ctx.state });
      }

      trace('load start');
      await player.load(midiUrl);
      trace('load done');

      if (ctx && ctx.state === 'suspended') {
        await ctx.resume().catch(() => undefined);
        trace('resume after load', { state: ctx.state });
      }

      player.play();
      trace('play() called');
      void this.nudgeMidi();
    } catch (err) {
      trace('FAILED', err);
      if (import.meta.env.DEV) {
        console.warn('[AcknowledgementsScene] MIDI failed to start', err);
      }
    }
  }
}
