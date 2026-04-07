import { Buffer } from 'buffer';
import Phaser from 'phaser';

Object.assign(globalThis, { Buffer });

/** Minimal `process` for hyperswarm-web (`process.nextTick` in browser). */
const g = globalThis as unknown as {
  process?: { nextTick: (cb: () => void) => void; env: Record<string, string> };
};
if (!g.process) {
  g.process = {
    nextTick: (cb: () => void) => {
      queueMicrotask(cb);
    },
    env: { NODE_ENV: import.meta.env.PROD ? 'production' : 'development' },
  };
}

import { BootScene } from '@/scenes/BootScene';
import { CalibrationScene } from '@/scenes/CalibrationScene';
import { InfoScene } from '@/scenes/InfoScene';
import { PlayScene } from '@/scenes/PlayScene';
import { PvpLobbyScene } from '@/scenes/PvpLobbyScene';
import { ResultsScene } from '@/scenes/ResultsScene';
import { SignInScene } from '@/scenes/SignInScene';
import { SongPrefsScene } from '@/scenes/SongPrefsScene';
import { SongSelectScene } from '@/scenes/SongSelectScene';
import { SyncLabScene } from '@/scenes/SyncLabScene';
import { TitleScene } from '@/scenes/TitleScene';

const parent = document.getElementById('game-root');
if (!parent) {
  throw new Error('Missing #game-root');
}

void new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: 960,
  height: 540,
  backgroundColor: '#0a0a12',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    SignInScene,
    TitleScene,
    SongPrefsScene,
    PvpLobbyScene,
    SongSelectScene,
    InfoScene,
    PlayScene,
    ResultsScene,
    CalibrationScene,
    SyncLabScene,
  ],
});
