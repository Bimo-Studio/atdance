import type Phaser from 'phaser';

/**
 * Non-network stub: schedules “remote ready” and optional score ticks during stub play.
 */
export class MockPvpRemote {
  private readyTimer?: Phaser.Time.TimerEvent;
  private scoreEvent?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Fire `onReady` after `delayMs` (simulates opponent pressing Ready). */
  scheduleRemoteReady(delayMs: number, onReady: () => void): void {
    this.readyTimer = this.scene.time.delayedCall(delayMs, onReady);
  }

  /** Periodic fake remote score for HUD (stub play). */
  startScoreLoop(onTick: (remote: { combo: number; miss: number }) => void): void {
    let combo = 0;
    this.scoreEvent = this.scene.time.addEvent({
      delay: 350,
      loop: true,
      callback: () => {
        combo += 1;
        const miss = Math.floor(combo / 6);
        onTick({ combo, miss });
      },
    });
  }

  destroy(): void {
    this.readyTimer?.destroy();
    this.scoreEvent?.destroy();
    this.readyTimer = undefined;
    this.scoreEvent = undefined;
  }
}
