import Phaser from 'phaser';

import { BootScene } from '@/scenes/BootScene';
import { CalibrationScene } from '@/scenes/CalibrationScene';
import { PlayScene } from '@/scenes/PlayScene';
import { ResultsScene } from '@/scenes/ResultsScene';
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
    TitleScene,
    SongSelectScene,
    PlayScene,
    ResultsScene,
    CalibrationScene,
    SyncLabScene,
  ],
});
