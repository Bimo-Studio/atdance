import Phaser from 'phaser';

import { getAtprotoOAuthSession } from '@/auth/atprotoSession';
import { isE2eMode, setE2eStatus } from '@/util/e2eFlags';

function formatDid(did: string): string {
  if (did.length <= 36) {
    return did;
  }
  return `${did.slice(0, 20)}…${did.slice(-8)}`;
}

const BTN_STYLE = [
  'width:100%',
  'min-width:0',
  'padding:8px 10px',
  'box-sizing:border-box',
  'border:1px solid #445566',
  'border-radius:6px',
  'background:#1a1a24',
  'color:#e8e8f0',
  'font-family:system-ui,sans-serif',
  'font-size:14px',
  'cursor:pointer',
  'text-align:left',
  'line-height:1.3',
  'word-wrap:break-word',
  'hyphens:auto',
].join(';');

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    if (isE2eMode()) {
      setE2eStatus('title');
    }
    const session = getAtprotoOAuthSession();
    const didLine = session?.sub?.startsWith('did:') ? formatDid(session.sub) : '—';

    const shell = document.createElement('div');
    shell.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483646',
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'justify-content:flex-start',
      'padding:8px 12px max(8px,env(safe-area-inset-bottom,0px))',
      'box-sizing:border-box',
      'max-height:100dvh',
      'overflow-y:auto',
      'overflow-x:hidden',
      '-webkit-overflow-scrolling:touch',
      'pointer-events:none',
    ].join(';');

    const column = document.createElement('div');
    column.setAttribute('lang', 'en');
    column.style.cssText = [
      'pointer-events:auto',
      'width:100%',
      'max-width:min(520px,100%)',
      'display:flex',
      'flex-direction:column',
      'align-items:stretch',
      'gap:0',
      'flex-shrink:0',
    ].join(';');

    const signed = document.createElement('p');
    signed.style.cssText =
      'margin:0;font-family:system-ui,sans-serif;font-size:14px;color:#778899;text-align:center;line-height:1.4;white-space:pre-line;';
    signed.textContent = `Signed in\n${didLine}`;

    const brand = document.createElement('div');
    brand.style.cssText = 'margin-top:6px;text-align:center;';
    const titleLine = document.createElement('div');
    titleLine.style.cssText =
      'font-family:system-ui,sans-serif;font-size:clamp(22px,5vw,28px);font-weight:500;color:#e8e8f0;line-height:1.15;';
    titleLine.textContent = 'ATDance';
    const domainLine = document.createElement('div');
    domainLine.style.cssText =
      'font-family:system-ui,sans-serif;font-size:clamp(14px,3.5vw,17px);color:#aabbcc;margin-top:4px;line-height:1.25;word-break:break-word;';
    domainLine.textContent = 'dance.malldao.xyz';
    brand.appendChild(titleLine);
    brand.appendChild(domainLine);

    const actions = document.createElement('div');
    actions.style.cssText = [
      'display:grid',
      'grid-template-columns:minmax(0,1fr) minmax(0,1fr)',
      'gap:8px',
      'margin-top:12px',
      'width:100%',
      'align-items:stretch',
    ].join(';');
    actions.setAttribute('role', 'navigation');
    actions.setAttribute('aria-label', 'Title menu');

    const addNavBtn = (label: string, sceneKey: string, sceneData?: object) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.cssText = BTN_STYLE;
      b.textContent = label;
      b.addEventListener('click', () => {
        this.scene.start(sceneKey, sceneData);
      });
      actions.appendChild(b);
    };

    addNavBtn('Song select — Space', 'SongSelectScene');
    addNavBtn('Song priority — K', 'SongPrefsScene');
    addNavBtn('Magnet library — M', 'MagnetLibraryScene');
    addNavBtn('PvP lobby — P', 'PvpLobbyScene');
    addNavBtn('Build info — I', 'InfoScene', { backSceneKey: 'TitleScene' });
    addNavBtn('Calibration — C', 'CalibrationScene');
    addNavBtn('Sync lab — T', 'SyncLabScene');

    column.appendChild(signed);
    column.appendChild(brand);
    column.appendChild(actions);
    shell.appendChild(column);
    document.body.appendChild(shell);

    const goSongSelect = () => {
      this.scene.start('SongSelectScene');
    };
    this.input.keyboard?.once('keydown-SPACE', goSongSelect);

    const onKeyNav = (ev: KeyboardEvent) => {
      if (ev.code === 'KeyI') {
        this.scene.start('InfoScene', { backSceneKey: 'TitleScene' });
        return;
      }
      if (ev.code === 'KeyK') {
        this.scene.start('SongPrefsScene');
        return;
      }
      if (ev.code === 'KeyM') {
        this.scene.start('MagnetLibraryScene');
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
    };
    this.input.keyboard?.on('keydown', onKeyNav);

    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown', onKeyNav);
      shell.remove();
    });
  }
}
