import Phaser from 'phaser';

import { requirePlaySession } from '@/auth/requirePlaySession';
import { median } from '@/calibration/median';
import { setCalibrationOffsetSec } from '@/calibration/storage';

const BEATS = 8;
/** 120 BPM quarter notes */
const BEAT_INTERVAL_SEC = 0.5;
/** After first Space / click, wait this many seconds before the first beep. */
const PRE_BEEP_COUNTDOWN_SEC = 3;
/** Cue travels this long before each beep (horizontal approach). */
const CUE_TRAVEL_SEC = 0.46;

const BRICK_W = 48;
const BRICK_H = 26;
const TARGET_STROKE = 0x7a9cbc;
const CUE_FILL = 0x5a9fd0;
const CUE_STROKE = 0x2a4058;

type CalPhase = 'idle' | 'countdown' | 'running' | 'done';

function scheduleBeep(ctx: AudioContext, atSec: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  g.gain.value = 0.12;
  osc.type = 'sine';
  osc.frequency.value = 880;
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(atSec);
  osc.stop(atSec + 0.06);
}

export class CalibrationScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.Text;
  private countdownBig!: Phaser.GameObjects.Text;
  private trackG!: Phaser.GameObjects.Graphics;
  private ctx: AudioContext | null = null;
  private t0Sec = 0;
  private taps: number[] = [];
  private collecting = false;
  private done = false;
  /** True after first start (countdown or run) so we do not double-trigger. */
  private sequenceStarted = false;
  private phase: CalPhase = 'idle';
  private hitLineX = 0;
  private trackY = 0;

  constructor() {
    super({ key: 'CalibrationScene' });
  }

  create(): void {
    if (!requirePlaySession(this)) {
      return;
    }
    this.phase = 'idle';
    this.hitLineX = Math.round(this.scale.width * 0.68);
    this.trackY = Math.round(this.scale.height * 0.52);

    this.add
      .text(this.scale.width / 2, 56, 'Calibration', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5);

    this.trackG = this.add.graphics();
    this.trackG.setDepth(5);

    this.countdownBig = this.add
      .text(this.scale.width / 2, 220, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '72px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5);

    this.status = this.add
      .text(
        this.scale.width / 2,
        300,
        'Tap in time with 8 beeps (120 BPM).\n\nClick or press SPACE to start — a 3s countdown runs before the first beep.\nThen tap SPACE or click on each beat (8 taps).',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: '#aabccc',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    this.input.on('pointerdown', () => {
      if (this.phase === 'idle') {
        this.beginPreBeepCountdown();
      } else if (this.phase === 'running') {
        this.onTap();
      }
    });

    this.input.keyboard?.on('keydown-SPACE', (ev: KeyboardEvent) => {
      if (ev.repeat) {
        return;
      }
      if (this.phase === 'idle') {
        this.beginPreBeepCountdown();
      } else if (this.phase === 'running') {
        this.onTap();
      }
    });

    this.input.keyboard?.once('keydown-ESC', () => {
      this.scene.start('TitleScene');
    });

    this.events.once('shutdown', () => {
      void this.ctx?.close();
    });
  }

  private beginPreBeepCountdown(): void {
    if (this.sequenceStarted || this.done) {
      return;
    }
    this.sequenceStarted = true;
    this.phase = 'countdown';
    this.status.setText('Get ready — first measurement when the countdown hits zero.');
    this.runCountdownStep(PRE_BEEP_COUNTDOWN_SEC);
  }

  private runCountdownStep(n: number): void {
    if (this.done) {
      return;
    }
    if (n > 0) {
      this.countdownBig.setText(String(n));
      this.time.delayedCall(1000, () => this.runCountdownStep(n - 1));
    } else {
      this.countdownBig.setText('');
      void this.startMetronome();
    }
  }

  private async startMetronome(): Promise<void> {
    if (this.done) {
      return;
    }
    this.phase = 'running';
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      this.status.setText('Web Audio not available.');
      return;
    }
    this.ctx = new Ctx();
    await this.ctx.resume();
    this.taps = [];
    this.collecting = true;
    this.t0Sec = this.ctx.currentTime + 0.22;
    for (let k = 0; k < BEATS; k++) {
      scheduleBeep(this.ctx, this.t0Sec + k * BEAT_INTERVAL_SEC);
    }
    this.status.setText(
      'Watch the brick reach the outline on the beat — tap SPACE or click each time (8 taps).',
    );
  }

  private readonly onTap = (): void => {
    if (!this.collecting || !this.ctx || this.done) {
      return;
    }
    this.taps.push(this.ctx.currentTime);
    if (this.taps.length >= BEATS) {
      this.finish();
    }
  };

  private finish(): void {
    if (!this.ctx || this.done) {
      return;
    }
    this.done = true;
    this.collecting = false;
    this.phase = 'done';

    const deltas: number[] = [];
    for (let i = 0; i < BEATS; i++) {
      const tap = this.taps[i];
      const expected = this.t0Sec + i * BEAT_INTERVAL_SEC;
      if (tap !== undefined) {
        deltas.push(tap - expected);
      }
    }
    const m = median(deltas);
    setCalibrationOffsetSec(m);
    this.status.setText(
      `Saved offset: ${(m * 1000).toFixed(1)} ms\n(positive = you tap after the beep)\n\nPress ENTER or click to return`,
    );

    const back = () => {
      this.scene.start('TitleScene');
    };
    this.input.once('pointerdown', back);
    this.input.keyboard?.once('keydown-ENTER', back);
  }

  update(): void {
    const cy = this.trackY;
    const hx = this.hitLineX;
    this.trackG.clear();

    this.trackG.lineStyle(2, 0xffffff, 0.28);
    this.trackG.lineBetween(52, cy, hx + 24, cy);

    this.trackG.lineStyle(2, TARGET_STROKE, 0.92);
    this.trackG.strokeRect(hx - BRICK_W / 2, cy - BRICK_H / 2, BRICK_W, BRICK_H);

    if (this.phase !== 'running' || !this.ctx) {
      return;
    }

    const t = this.ctx.currentTime;
    let drawn = false;
    for (let k = 0; k < BEATS && !drawn; k += 1) {
      const beatT = this.t0Sec + k * BEAT_INTERVAL_SEC;
      const travelStart = beatT - CUE_TRAVEL_SEC;
      if (t < travelStart || t > beatT + 0.1) {
        continue;
      }
      const frac = Phaser.Math.Clamp((t - travelStart) / CUE_TRAVEL_SEC, 0, 1);
      const leftEdge = 52;
      const cueCx = Phaser.Math.Linear(leftEdge + BRICK_W / 2, hx, frac);
      this.trackG.fillStyle(CUE_FILL, 1);
      this.trackG.fillRect(cueCx - BRICK_W / 2, cy - BRICK_H / 2, BRICK_W, BRICK_H);
      this.trackG.lineStyle(1, CUE_STROKE, 0.88);
      this.trackG.strokeRect(cueCx - BRICK_W / 2, cy - BRICK_H / 2, BRICK_W, BRICK_H);
      drawn = true;
    }
  }
}
