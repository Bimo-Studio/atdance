import Phaser from 'phaser';

import { getAtprotoOAuthSession } from '@/auth/atprotoSession';

function formatDid(did: string): string {
  if (did.length <= 36) {
    return did;
  }
  return `${did.slice(0, 20)}…${did.slice(-8)}`;
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const session = getAtprotoOAuthSession();
    const didLine = session?.sub?.startsWith('did:') ? formatDid(session.sub) : '—';

    this.add
      .text(this.scale.width / 2, 56, `Signed in\n${didLine}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#778899',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 20, 'ATDance\ndance.malldao.xyz', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#e8e8f0',
        align: 'center',
      })
      .setOrigin(0.5);
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 56,
        'SPACE or click — song select  •  K — song priority  •  P — PvP lobby  •  I — build info  •  C — calibration  •  T — sync lab',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: '#8899aa',
          align: 'center',
        },
      )
      .setOrigin(0.5);
    const goPlay = () => {
      this.scene.start('SongSelectScene');
    };
    this.input.keyboard?.once('keydown-SPACE', goPlay);
    this.input.once('pointerdown', goPlay);
    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'KeyI') {
        this.scene.start('InfoScene', { backSceneKey: 'TitleScene' });
        return;
      }
      if (ev.code === 'KeyK') {
        this.scene.start('SongPrefsScene');
        return;
      }
      if (ev.code === 'KeyP') {
        this.scene.start('PvpLobbyScene');
        return;
      }
      if (ev.code === 'KeyC') {
        this.scene.start('CalibrationScene');
      }
      if (ev.code === 'KeyT') {
        this.scene.start('SyncLabScene');
      }
    });
  }
}
