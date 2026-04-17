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

import { AcknowledgementsScene } from '@/scenes/AcknowledgementsScene';
import { BootScene } from '@/scenes/BootScene';
import { CalibrationScene } from '@/scenes/CalibrationScene';
import { InfoScene } from '@/scenes/InfoScene';
import { MagnetLibraryScene } from '@/scenes/MagnetLibraryScene';
import { PlayScene } from '@/scenes/PlayScene';
import { PvpLobbyScene } from '@/scenes/PvpLobbyScene';
import { ResultsScene } from '@/scenes/ResultsScene';
import { SignInScene } from '@/scenes/SignInScene';
import { SongPrefsScene } from '@/scenes/SongPrefsScene';
import { SongSelectScene } from '@/scenes/SongSelectScene';
import { SyncLabScene } from '@/scenes/SyncLabScene';
import { TitleScene } from '@/scenes/TitleScene';
import { installAccountMenuHud } from '@/ui/accountMenuHud';
import { loopbackUrlFromLocalhost } from '@/util/loopbackDevRedirect';

if (import.meta.env.VITE_INVITE_ONLY === '1') {
  document.documentElement.setAttribute('data-invite-only', '1');
}

/**
 * ATProto OAuth client normalizes loopback to `127.0.0.1` during `init()`; doing that
 * after Phaser boots looks like a broken tab (flash + HMR disconnect). Redirect first.
 */
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const next = loopbackUrlFromLocalhost(window.location.href);
  if (next !== null) {
    window.location.replace(next);
  } else {
    startPhaserGame();
  }
} else {
  startPhaserGame();
}

function startPhaserGame(): void {
  const parent = document.getElementById('game-root');
  if (!parent) {
    throw new Error('Missing #game-root');
  }

  installAccountMenuHud();

  void new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    disableContextMenu: false,
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
      MagnetLibraryScene,
      PvpLobbyScene,
      SongSelectScene,
      InfoScene,
      AcknowledgementsScene,
      PlayScene,
      ResultsScene,
      CalibrationScene,
      SyncLabScene,
    ],
  });
}
