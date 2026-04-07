import Phaser from 'phaser';

import { requirePlaySession } from '@/auth/requirePlaySession';
import type { PlaySceneData } from '@/play/playSceneData';
import { SONG_SELECT_ROWS } from '@/songSelect/songSelectRows';
import {
  loadSongPriority,
  saveSongPriority,
  setSlot,
  type SongPriorityState,
} from '@/pvp/songPriorityStore';
import { isE2eMode, setE2ePriorityHud, setE2eStatus } from '@/util/e2eFlags';
import { getStorageDid } from '@/util/storageDid';

/**
 * Edit 3 song priority slots (PRD P1). Keys 1–6 pick built-in rows; Q/W/E clear slots 1–3; R clear all; ESC back.
 */
export class SongPrefsScene extends Phaser.Scene {
  private state: SongPriorityState = { slots: [null, null, null] };
  private hud!: Phaser.GameObjects.Text;
  private did = '';

  constructor() {
    super({ key: 'SongPrefsScene' });
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
      setE2eStatus('song-prefs');
    }

    this.add
      .text(this.scale.width / 2, 36, 'Song priority (3 slots)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5);

    this.hud = this.add
      .text(this.scale.width / 2, 100, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#aabbcc',
        align: 'center',
      })
      .setOrigin(0.5, 0);

    this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 56,
        '1–6 = add chart to next empty slot  •  Q/W/E = clear slot 1/2/3  •  R = clear all  •  ESC = back',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: '#667788',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    let y = 200;
    for (const row of SONG_SELECT_ROWS) {
      this.add
        .text(80, y, row.label, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          color: '#8899aa',
        })
        .setOrigin(0, 0);
      y += 28;
    }

    void loadSongPriority(this.did).then((s) => {
      this.state = s;
      this.refreshHud();
    });

    this.refreshHud();

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'Escape') {
        this.scene.start('TitleScene');
        return;
      }
      if (ev.code === 'KeyR') {
        this.state = { slots: [null, null, null] };
        void this.persist();
        this.refreshHud();
        return;
      }
      if (ev.code === 'KeyQ') {
        this.state = setSlot(this.state, 0, null);
        void this.persist();
        this.refreshHud();
        return;
      }
      if (ev.code === 'KeyW') {
        this.state = setSlot(this.state, 1, null);
        void this.persist();
        this.refreshHud();
        return;
      }
      if (ev.code === 'KeyE') {
        this.state = setSlot(this.state, 2, null);
        void this.persist();
        this.refreshHud();
        return;
      }
      const n = digitToIndex(ev.code);
      if (n !== null) {
        const row = SONG_SELECT_ROWS[n];
        if (row) {
          this.assignNextSlot(row.data);
        }
      }
    });
  }

  private assignNextSlot(data: PlaySceneData): void {
    const slots = this.state.slots;
    for (let i = 0; i < 3; i += 1) {
      if (slots[i] === null) {
        const idx = i as 0 | 1 | 2;
        this.state = setSlot(this.state, idx, data);
        void this.persist();
        this.refreshHud();
        return;
      }
    }
    this.state = setSlot(this.state, 2, data);
    void this.persist();
    this.refreshHud();
  }

  private async persist(): Promise<void> {
    await saveSongPriority(this.did, this.state);
  }

  private refreshHud(): void {
    const lines = this.state.slots.map((s, i) => {
      const label = slotLabel(s);
      return `Slot ${i + 1}: ${label}`;
    });
    this.hud.setText(lines.join('\n'));
    if (isE2eMode()) {
      const summaries = this.state.slots.map((s) => slotLabel(s));
      setE2ePriorityHud(summaries.join('|'));
    }
  }
}

function digitToIndex(code: string): number | null {
  const m = /^Digit(\d)$/.exec(code);
  if (!m?.[1]) {
    return null;
  }
  const d = Number(m[1]);
  if (d < 1 || d > 6) {
    return null;
  }
  return d - 1;
}

function slotLabel(s: PlaySceneData | null): string {
  if (s === null) {
    return '(empty)';
  }
  if (s.useMinimal) {
    return 'Minimal fixture';
  }
  if (s.magnetUri) {
    return `Torrent…${s.magnetUri.slice(-12)}`;
  }
  return `${s.chartUrl ?? '?'} #${s.chartIndex ?? 0}`;
}
