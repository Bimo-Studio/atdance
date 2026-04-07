import Phaser from 'phaser';

import { requirePlaySession } from '@/auth/requirePlaySession';
import type { MagnetEntry } from '@/pvp/magnetLibraryStore';
import { loadMagnetLibrary, saveMagnetLibrary } from '@/pvp/magnetLibraryStore';
import { isE2eMode, setE2eMagnetHud, setE2eStatus } from '@/util/e2eFlags';
import { getStorageDid } from '@/util/storageDid';

/**
 * Edit per-account magnet URIs (PRD P1). DOM list + add form; ESC back to title.
 */
export class MagnetLibraryScene extends Phaser.Scene {
  private did = '';
  private magnets: MagnetEntry[] = [];
  private wrap: HTMLDivElement | null = null;

  constructor() {
    super({ key: 'MagnetLibraryScene' });
  }

  create(): void {
    if (!requirePlaySession(this)) {
      return;
    }
    this.did = getStorageDid();
    if (!this.did) {
      this.scene.start('TitleScene');
      return;
    }

    if (isE2eMode()) {
      setE2eStatus('magnet-library');
    }

    this.add
      .text(this.scale.width / 2, 36, 'Magnet library', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5);

    this.add
      .text(
        this.scale.width / 2,
        76,
        'Torrent charts (IndexedDB, namespaced by account). Max 50 magnets.',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          color: '#778899',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    void loadMagnetLibrary(this.did).then((m) => {
      this.magnets = [...m];
      void this.persistAndRender();
    });

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'Escape') {
        this.teardownDom();
        this.scene.start('TitleScene');
      }
    });

    this.events.once('shutdown', () => {
      this.teardownDom();
    });
  }

  private teardownDom(): void {
    this.wrap?.remove();
    this.wrap = null;
  }

  private async persistAndRender(): Promise<void> {
    await saveMagnetLibrary(this.did, this.magnets);
    if (isE2eMode()) {
      const first = this.magnets[0];
      setE2eMagnetHud(`${this.magnets.length}:${first?.label ?? first?.uri.slice(0, 12) ?? ''}`);
    }
    this.renderDom();
  }

  private renderDom(): void {
    this.teardownDom();
    const parent = this.game.canvas.parentElement;
    if (!parent) {
      return;
    }
    const wrap = document.createElement('div');
    this.wrap = wrap;
    wrap.style.cssText =
      'position:absolute;left:50%;transform:translateX(-50%);top:112px;width:min(560px,94vw);max-height:calc(100vh - 120px);overflow:auto;padding:12px;background:rgba(12,12,20,0.95);border:1px solid #334455;border-radius:8px;font-family:system-ui,sans-serif;font-size:13px;color:#aabbcc;';

    const title = document.createElement('div');
    title.textContent = 'Saved magnets';
    title.style.marginBottom = '10px';
    title.style.color = '#ccddee';
    wrap.appendChild(title);

    this.magnets.forEach((entry, index) => {
      const row = document.createElement('div');
      row.style.cssText =
        'display:flex;flex-direction:column;gap:6px;margin-bottom:10px;padding:8px;background:#14141c;border-radius:6px;border:1px solid #2a3344;';
      const top = document.createElement('div');
      top.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
      const uriEl = document.createElement('span');
      uriEl.style.cssText = 'flex:1;word-break:break-all;font-size:12px;color:#8899aa;';
      uriEl.textContent = entry.uri.length > 72 ? `${entry.uri.slice(0, 72)}…` : entry.uri;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.style.cssText =
        'padding:4px 10px;cursor:pointer;border-radius:4px;border:1px solid #556677;background:#2a2a36;color:#e8e8f0;';
      remove.addEventListener('click', () => {
        this.magnets = this.magnets.filter((_, i) => i !== index);
        void this.persistAndRender();
      });
      top.appendChild(uriEl);
      top.appendChild(remove);
      const labelIn = document.createElement('input');
      labelIn.type = 'text';
      labelIn.placeholder = 'Label (optional)';
      labelIn.value = entry.label ?? '';
      labelIn.style.cssText =
        'width:100%;box-sizing:border-box;padding:6px;background:#1a1a24;border:1px solid #445566;color:#e8e8f0;border-radius:4px;font-size:12px;';
      labelIn.addEventListener('blur', () => {
        const label = labelIn.value.trim();
        const next = [...this.magnets];
        next[index] = { uri: entry.uri, ...(label !== '' ? { label } : {}) };
        this.magnets = next;
        void saveMagnetLibrary(this.did, this.magnets);
        if (isE2eMode()) {
          const first = this.magnets[0];
          setE2eMagnetHud(
            `${this.magnets.length}:${first?.label ?? first?.uri.slice(0, 12) ?? ''}`,
          );
        }
      });
      row.appendChild(top);
      row.appendChild(labelIn);
      wrap.appendChild(row);
    });

    const addBlock = document.createElement('div');
    addBlock.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid #2a3344;';
    const addTitle = document.createElement('div');
    addTitle.textContent = 'Add magnet';
    addTitle.style.marginBottom = '6px';
    addTitle.style.color = '#ccddee';
    const uriInput = document.createElement('input');
    uriInput.type = 'text';
    uriInput.placeholder = 'magnet:?xt=urn:btih:…';
    uriInput.style.cssText =
      'width:100%;box-sizing:border-box;padding:8px;margin-bottom:8px;background:#1a1a24;border:1px solid #445566;color:#e8e8f0;border-radius:4px;';
    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'Label (optional)';
    labelInput.style.cssText =
      'width:100%;box-sizing:border-box;padding:8px;margin-bottom:8px;background:#1a1a24;border:1px solid #445566;color:#e8e8f0;border-radius:4px;';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = 'Add to library';
    addBtn.style.cssText =
      'padding:8px 14px;cursor:pointer;border-radius:4px;border:1px solid #556677;background:#2a2a36;color:#e8e8f0;';
    addBtn.addEventListener('click', () => {
      const raw = uriInput.value.trim();
      if (!raw.toLowerCase().startsWith('magnet:')) {
        return;
      }
      const label = labelInput.value.trim();
      const next: MagnetEntry = { uri: raw, ...(label !== '' ? { label } : {}) };
      this.magnets = [...this.magnets, next];
      uriInput.value = '';
      labelInput.value = '';
      void this.persistAndRender();
    });
    addBlock.appendChild(addTitle);
    addBlock.appendChild(uriInput);
    addBlock.appendChild(labelInput);
    addBlock.appendChild(addBtn);
    wrap.appendChild(addBlock);

    const hint = document.createElement('div');
    hint.textContent = 'ESC — back to title';
    hint.style.marginTop = '12px';
    hint.style.fontSize = '12px';
    hint.style.color = '#556677';
    wrap.appendChild(hint);

    parent.appendChild(wrap);
  }
}
