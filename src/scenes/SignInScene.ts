import Phaser from 'phaser';

import { oauthSignInWhatWeDo, oauthSignInWhatWeDoNot } from '@/auth/oauthSignInExplainerCopy';
import { syncAccountMenuForGameScene } from '@/ui/accountMenuHud';
import { wireAtprotoSignInForm } from '@/scenes/signInFormDom';
import { attachSignInMatrixRain } from '@/scenes/signInMatrixRain';
import { preloadSignInRainAssets } from '@/scenes/signInRainAssets';

/**
 * Required when no ATProto session (PRD P0). OAuth client aligns with Streamplace patterns.
 */
export class SignInScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SignInScene' });
  }

  preload(): void {
    preloadSignInRainAssets(this);
  }

  create(): void {
    syncAccountMenuForGameScene(this.scene.key);
    const detachRain = attachSignInMatrixRain(this);
    const host = document.body;
    const oauthEnabled = Boolean(import.meta.env.VITE_ATPROTO_PDS_HOST);
    let explainerEl: HTMLDivElement | null = null;

    if (oauthEnabled) {
      explainerEl = document.createElement('div');
      explainerEl.style.cssText = [
        'position:fixed',
        'left:50%',
        'transform:translateX(-50%)',
        'top:168px',
        'z-index:2147483645',
        'width:min(560px,94vw)',
        'max-height:calc(100dvh - 210px)',
        'overflow-y:auto',
        '-webkit-overflow-scrolling:touch',
        'padding:12px 14px',
        'box-sizing:border-box',
        'background:rgba(12,12,20,0.92)',
        'border:1px solid #334455',
        'border-radius:8px',
        'pointer-events:auto',
      ].join(';');

      const h2 = document.createElement('h2');
      h2.textContent = 'Before you continue';
      h2.style.cssText =
        'margin:0 0 8px;font-family:system-ui,sans-serif;font-size:15px;font-weight:600;color:#e8e8f0;';

      const intro = document.createElement('p');
      intro.textContent =
        'Your account provider will show its own approve screen next. Here is what ATDance uses sign-in for in this game:';
      intro.style.cssText =
        'margin:0 0 12px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.45;color:#aabbcc;';

      const ol = document.createElement('ol');
      ol.style.cssText = [
        'margin:0 0 16px',
        'padding-left:1.25em',
        'font-family:system-ui,sans-serif',
        'font-size:13px',
        'line-height:1.45',
        'color:#c8d0dc',
        'display:flex',
        'flex-direction:column',
        'gap:10px',
      ].join(';');
      for (const b of oauthSignInWhatWeDo) {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = `${b.title}.`;
        li.appendChild(strong);
        li.appendChild(document.createTextNode(` ${b.body}`));
        ol.appendChild(li);
      }

      const sub = document.createElement('div');
      sub.textContent = 'What ATDance does not do';
      sub.style.cssText =
        'margin:0 0 8px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;color:#e8e8f0;';

      const ul = document.createElement('ul');
      ul.style.cssText = [
        'margin:0',
        'padding-left:1.25em',
        'font-family:system-ui,sans-serif',
        'font-size:13px',
        'line-height:1.45',
        'color:#aabbcc',
        'display:flex',
        'flex-direction:column',
        'gap:10px',
      ].join(';');
      for (const b of oauthSignInWhatWeDoNot) {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = `${b.title}.`;
        li.appendChild(strong);
        li.appendChild(document.createTextNode(` ${b.body}`));
        ul.appendChild(li);
      }

      const note = document.createElement('p');
      note.textContent =
        'The provider lists permissions in its own words. This box is ours so you know how we use sign-in here.';
      note.style.cssText =
        'margin:12px 0 0;font-family:system-ui,sans-serif;font-size:12px;line-height:1.4;color:#778899;';

      explainerEl.appendChild(h2);
      explainerEl.appendChild(intro);
      explainerEl.appendChild(ol);
      explainerEl.appendChild(sub);
      explainerEl.appendChild(ul);
      explainerEl.appendChild(note);
      host.appendChild(explainerEl);
    }

    this.add
      .text(this.scale.width / 2, 120, 'Sign in to play', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#e8e8f0',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setShadow(0, 3, '#061208', 8, true, true);

    /** Fixed to `body` so Phaser’s canvas (full-game hit target) does not steal clicks from the form. */
    const wrap = document.createElement('div');
    wrap.style.cssText =
      'position:fixed;left:50%;transform:translateX(-50%);bottom:24px;z-index:2147483646;width:min(520px,94vw);padding:10px 12px;background:rgba(12,12,20,0.92);border:1px solid #334455;border-radius:8px;font-family:system-ui,sans-serif;font-size:13px;color:#aabbcc;pointer-events:auto;';
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
    wireAtprotoSignInForm(input, btn, status);
    row.appendChild(input);
    row.appendChild(btn);
    wrap.appendChild(status);
    wrap.appendChild(row);
    host.appendChild(wrap);
    this.events.once('shutdown', () => {
      detachRain();
      explainerEl?.remove();
      wrap.remove();
    });
  }
}
