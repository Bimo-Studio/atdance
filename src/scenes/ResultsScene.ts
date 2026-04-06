import { Agent } from '@atproto/api';
import Phaser from 'phaser';

import { getAtprotoOAuthSession } from '@/auth/atprotoSession';
import { saveScoreWithAgent } from '@/atproto/saveScoreToPds';
import { buildDanceScoreRecord, stableChartHash } from '@/lexicon/buildDanceScoreRecord';
import type { ResultsSceneData } from '@/play/resultsSceneData';
import { ATDANCE_CLIENT_BUILD } from '@/version';

export class ResultsScene extends Phaser.Scene {
  private payload: ResultsSceneData | null = null;

  constructor() {
    super({ key: 'ResultsScene' });
  }

  init(data?: ResultsSceneData): void {
    this.payload = data ?? null;
  }

  create(): void {
    const d = this.payload;
    const summary = d?.summary;
    const label = d?.songLabel ?? 'Song';

    const lines = summary
      ? [
          label,
          '',
          `Grade: ${summary.letter}  (rank ${(summary.rank * 100).toFixed(1)}%)`,
          `Dance points: ${summary.score}`,
          `Max combo: ${summary.maxCombo}`,
          `Arrows: ${summary.arrowCount}`,
          `Counts — V:${summary.counts.V} P:${summary.counts.P} G:${summary.counts.G} O:${summary.counts.O} B:${summary.counts.B} M:${summary.counts.M}`,
          '',
          'R — song select',
        ].join('\n')
      : 'No results.\nR — song select';

    this.add
      .text(this.scale.width / 2, this.scale.height / 2, lines, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#e8e8f0',
        align: 'center',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'KeyR') {
        this.scene.start('SongSelectScene');
      }
    });

    const parent = this.game.canvas.parentElement;
    const pdsHost = import.meta.env.VITE_ATPROTO_PDS_HOST;
    if (parent && d && summary && pdsHost && d.playKey !== undefined && d.songId !== undefined) {
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:absolute;left:50%;transform:translateX(-50%);bottom:12px;width:min(560px,94vw);padding:10px;background:rgba(12,12,20,0.92);border:1px solid #334455;border-radius:8px;font-family:system-ui,sans-serif;font-size:13px;color:#aabbcc;';
      const status = document.createElement('div');
      status.style.marginBottom = '8px';
      status.style.fontSize = '12px';
      status.textContent = 'Cloud save: sign in from the title screen, then click Save.';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Save score to PDS';
      btn.style.cssText =
        'padding:8px 14px;cursor:pointer;border-radius:4px;border:1px solid #556677;background:#2a2a36;color:#e8e8f0;';
      btn.addEventListener('click', () => {
        void (async () => {
          const session = getAtprotoOAuthSession();
          if (!session) {
            status.textContent = 'Not signed in — Title screen → Sign in with ATProto handle.';
            status.style.color = '#ffaaaa';
            return;
          }
          btn.disabled = true;
          status.textContent = 'Saving…';
          status.style.color = '#aabbcc';
          try {
            const agent = new Agent(session);
            const record = buildDanceScoreRecord({
              songId: d.songId,
              chartHash: stableChartHash(d.playKey),
              summary,
              clientBuild: ATDANCE_CLIENT_BUILD,
              playedAt: new Date().toISOString(),
            });
            await saveScoreWithAgent(agent, record);
            status.textContent = 'Saved';
            status.style.color = '#88ffaa';
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            status.textContent = `Save failed (${msg}). Local play still works — retry or check PDS.`;
            status.style.color = '#ffaaaa';
            btn.disabled = false;
          }
        })();
      });
      row.appendChild(btn);
      wrap.appendChild(status);
      wrap.appendChild(row);
      parent.appendChild(wrap);
      this.events.once('shutdown', () => {
        wrap.remove();
      });
    }
  }
}
