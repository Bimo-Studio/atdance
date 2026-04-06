import Phaser from 'phaser';

import { playDataFromMagnet } from '@/songSelect/torrentPlayData';
import { digitIndexFromKey, SONG_SELECT_ROWS } from '@/songSelect/songSelectRows';
import { setE2eStatus } from '@/util/e2eFlags';

export class SongSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SongSelectScene' });
  }

  create(): void {
    setE2eStatus('song-select');
    this.add
      .text(this.scale.width / 2, 56, 'Select song', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5);

    this.add
      .text(
        this.scale.width / 2,
        100,
        'Charts & audio cache in IndexedDB after first load.\nTorrent: paste magnet, Load — timeout → HTTP fallback.\nR — back to title',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#778899',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    let y = 160;
    for (const row of SONG_SELECT_ROWS) {
      const t = this.add
        .text(this.scale.width / 2, y, row.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          color: '#aabbcc',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => {
        this.scene.start('PlayScene', row.data);
      });
      t.on('pointerover', () => t.setStyle({ color: '#e8f0ff' }));
      t.on('pointerout', () => t.setStyle({ color: '#aabbcc' }));
      y += 44;
    }

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'KeyR') {
        this.scene.start('TitleScene');
        return;
      }
      const n = digitIndexFromKey(ev.code);
      if (n !== null) {
        const row = SONG_SELECT_ROWS[n];
        if (row) {
          this.scene.start('PlayScene', row.data);
        }
      }
    });

    const parent = this.game.canvas.parentElement;
    if (parent) {
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:absolute;left:50%;transform:translateX(-50%);bottom:12px;width:min(560px,94vw);padding:10px;background:rgba(12,12,20,0.92);border:1px solid #334455;border-radius:8px;font-family:system-ui,sans-serif;font-size:13px;color:#aabbcc;';
      const label = document.createElement('div');
      label.textContent = 'Magnet link (WebTorrent)';
      label.style.marginBottom = '6px';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'magnet:?xt=urn:btih:…';
      input.style.cssText =
        'width:100%;box-sizing:border-box;padding:8px;background:#1a1a24;border:1px solid #445566;color:#e8e8f0;border-radius:4px;';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;margin-top:8px;align-items:center;';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Load from magnet';
      btn.style.cssText =
        'padding:8px 14px;cursor:pointer;border-radius:4px;border:1px solid #556677;background:#2a2a36;color:#e8e8f0;';
      const status = document.createElement('span');
      status.style.flex = '1';
      status.style.fontSize = '12px';
      status.style.color = '#8899aa';
      row.appendChild(btn);
      row.appendChild(status);
      wrap.appendChild(label);
      wrap.appendChild(input);
      wrap.appendChild(row);
      parent.appendChild(wrap);

      const startMagnet = (): void => {
        const raw = input.value.trim();
        if (raw.length === 0) {
          status.textContent = 'Error: paste a magnet URI.';
          return;
        }
        if (!raw.toLowerCase().startsWith('magnet:')) {
          status.textContent = 'Error: must start with magnet:';
          return;
        }
        status.textContent = 'Starting…';
        this.scene.start('PlayScene', playDataFromMagnet(raw));
      };
      btn.addEventListener('click', () => {
        startMagnet();
      });
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          startMagnet();
        }
      });

      this.events.once('shutdown', () => {
        wrap.remove();
      });
    }
  }
}
