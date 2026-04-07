import Phaser from 'phaser';

import { loadAtprotoOAuthClient } from '@/auth/streamplaceOAuth';

/**
 * Required when no ATProto session (PRD P0). OAuth client aligns with Streamplace patterns.
 */
export class SignInScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SignInScene' });
  }

  create(): void {
    this.add
      .text(this.scale.width / 2, 120, 'Sign in to play', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#e8e8f0',
        align: 'center',
      })
      .setOrigin(0.5);
    this.add
      .text(
        this.scale.width / 2,
        200,
        'ATProto OAuth — sessions stored in IndexedDB.\nSet VITE_ATPROTO_PDS_HOST in .env.local for your PDS.',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          color: '#8899aa',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    const parent = this.game.canvas.parentElement;
    if (!parent) {
      return;
    }
    const wrap = document.createElement('div');
    wrap.style.cssText =
      'position:absolute;left:50%;transform:translateX(-50%);bottom:24px;width:min(520px,94vw);padding:10px 12px;background:rgba(12,12,20,0.92);border:1px solid #334455;border-radius:8px;font-family:system-ui,sans-serif;font-size:13px;color:#aabbcc;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
    const status = document.createElement('span');
    status.style.flex = '1';
    status.textContent = import.meta.env.VITE_ATPROTO_PDS_HOST
      ? 'Enter your handle, then sign in.'
      : 'Missing VITE_ATPROTO_PDS_HOST — OAuth disabled.';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'handle.example.com';
    input.style.cssText =
      'min-width:140px;flex:1;padding:8px;background:#1a1a24;border:1px solid #445566;color:#e8e8f0;border-radius:4px;';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Sign in with ATProto';
    btn.style.cssText =
      'padding:8px 12px;cursor:pointer;border-radius:4px;border:1px solid #556677;background:#2a2a36;color:#e8e8f0;';
    btn.addEventListener('click', () => {
      void (async () => {
        const h = input.value.trim();
        if (!h) {
          status.textContent = 'Enter your handle.';
          return;
        }
        const client = await loadAtprotoOAuthClient();
        if (!client) {
          status.textContent = 'OAuth client unavailable (check env).';
          return;
        }
        await client.signInRedirect(h);
      })();
    });
    row.appendChild(input);
    row.appendChild(btn);
    wrap.appendChild(status);
    wrap.appendChild(row);
    parent.appendChild(wrap);
    this.events.once('shutdown', () => {
      wrap.remove();
    });
  }
}
