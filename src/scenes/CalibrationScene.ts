import Phaser from 'phaser';

import { median } from '@/calibration/median';
import { setCalibrationOffsetSec } from '@/calibration/storage';

const BEATS = 8;
/** 120 BPM quarter notes */
const BEAT_INTERVAL_SEC = 0.5;

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
  private ctx: AudioContext | null = null;
  private t0Sec = 0;
  private taps: number[] = [];
  private collecting = false;
  private done = false;
  private metronomeStarted = false;

  constructor() {
    super({ key: 'CalibrationScene' });
  }

  create(): void {
    this.add
      .text(this.scale.width / 2, 80, 'Calibration', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5);

    this.status = this.add
      .text(
        this.scale.width / 2,
        200,
        'Tap in time with 8 beeps (120 BPM).\n\nClick here or press SPACE to start the metronome,\nthen tap SPACE or click on each beat (8 taps).',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          color: '#aabccc',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    const start = () => {
      void this.startMetronome();
    };
    this.input.once('pointerdown', start);
    this.input.keyboard?.once('keydown-SPACE', start);

    this.input.keyboard?.once('keydown-ESC', () => {
      this.scene.start('TitleScene');
    });

    this.events.once('shutdown', () => {
      void this.ctx?.close();
    });
  }

  private readonly onKeyTap = (ev: KeyboardEvent): void => {
    if (ev.code !== 'Space' || ev.repeat) {
      return;
    }
    this.onTap();
  };

  private async startMetronome(): Promise<void> {
    if (this.metronomeStarted || this.done) {
      return;
    }
    this.metronomeStarted = true;
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
    this.t0Sec = this.ctx.currentTime + 0.15;
    for (let k = 0; k < BEATS; k++) {
      scheduleBeep(this.ctx, this.t0Sec + k * BEAT_INTERVAL_SEC);
    }
    this.status.setText('Listen… tap 8 times on the beats (SPACE or click).');

    this.input.keyboard?.on('keydown', this.onKeyTap);
    this.input.on('pointerdown', this.onTap);
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
    this.input.keyboard?.off('keydown', this.onKeyTap);
    this.input.off('pointerdown', this.onTap);

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
}
