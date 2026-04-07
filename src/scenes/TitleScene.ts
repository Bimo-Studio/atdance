import Phaser from 'phaser';

import { getAtprotoOAuthSession } from '@/auth/atprotoSession';
import { createBrowserOAuthClient } from '@/auth/browserOAuth';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 40, 'ATDance\ndance.malldao.xyz', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#e8e8f0',
        align: 'center',
      })
      .setOrigin(0.5);
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 48,
        'SPACE or click — song select  •  I — build info  •  C — calibration  •  T — clock sync lab',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
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
      if (ev.code === 'KeyC') {
        this.scene.start('CalibrationScene');
      }
      if (ev.code === 'KeyT') {
        this.scene.start('SyncLabScene');
      }
    });

    const parent = this.game.canvas.parentElement;
    if (parent && import.meta.env.VITE_ATPROTO_PDS_HOST) {
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:absolute;left:50%;transform:translateX(-50%);bottom:8px;width:min(520px,94vw);padding:8px 10px;background:rgba(12,12,20,0.92);border:1px solid #334455;border-radius:8px;font-family:system-ui,sans-serif;font-size:12px;color:#8899aa;';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
      const session = getAtprotoOAuthSession();
      const status = document.createElement('span');
      status.style.flex = '1';
      status.textContent = session ? `ATProto session: ${session.sub}` : 'ATProto: not signed in';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'handle.example.com';
      input.style.cssText =
        'min-width:140px;flex:1;padding:6px;background:#1a1a24;border:1px solid #445566;color:#e8e8f0;border-radius:4px;';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Sign in (PDS OAuth)';
      btn.style.cssText =
        'padding:6px 10px;cursor:pointer;border-radius:4px;border:1px solid #556677;background:#2a2a36;color:#e8e8f0;';
      btn.addEventListener('click', () => {
        const h = input.value.trim();
        if (!h) {
          status.textContent = 'Enter your handle.';
          return;
        }
        const client = createBrowserOAuthClient();
        if (!client) {
          status.textContent = 'OAuth client unavailable.';
          return;
        }
        void client.signInRedirect(h);
      });
      row.appendChild(input);
      row.appendChild(btn);
      wrap.appendChild(status);
      wrap.appendChild(row);
      const hint = document.createElement('div');
      hint.textContent =
        'Refresh tokens stay in IndexedDB (not localStorage). Requires hosted client metadata in production.';
      hint.style.cssText = 'margin-top:6px;font-size:11px;opacity:0.85;';
      wrap.appendChild(hint);
      parent.appendChild(wrap);
      this.events.once('shutdown', () => {
        wrap.remove();
      });
    }
  }
}
