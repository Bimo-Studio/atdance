import Phaser from 'phaser';

import { requirePlaySession } from '@/auth/requirePlaySession';
import { parseViteP2PBootstrap } from '@/p2p/bootstrapUrl';
import { formatP2PSyncLabUserError } from '@/p2p/p2pSyncLabErrors';
import { emaAlpha, ntpOffsetMs, ntpRttMs } from '@/sync/ntp';
import { isOffsetUnstable } from '@/sync/syncStability';
import { describeWebSocketClose, formatSyncLabUserError } from '@/sync/syncLabErrors';
import {
  parseSyncPongV1,
  stringifySyncPingV1,
  type SyncPingV1,
  type SyncPongV1,
} from '@/sync/syncMessage';
import { randomTopicHex } from '@/p2p/randomTopic';
import { isE2eMode, setE2eStatus } from '@/util/e2eFlags';
import { syncLabP2pShareUrl } from '@/util/syncLabP2pShareUrl';
import { syncAccountMenuForGameScene } from '@/ui/accountMenuHud';
import { syncLabP2pTopicLabel, syncLabTransportMode } from '@/util/syncLabMode';

function relayWsUrl(): string {
  const v = import.meta.env.VITE_RELAY_WS;
  if (typeof v === 'string' && v.length > 0) {
    return v;
  }
  if (import.meta.env.DEV) {
    return 'ws://127.0.0.1:8787';
  }
  return '';
}

export class SyncLabScene extends Phaser.Scene {
  private ws: WebSocket | null = null;

  constructor() {
    super({ key: 'SyncLabScene' });
  }

  create(): void {
    syncAccountMenuForGameScene(this.scene.key);
    if (!requirePlaySession(this)) {
      return;
    }
    if (syncLabTransportMode() === 'p2p') {
      this.createP2p();
    } else {
      this.createRelay();
    }
    if (isE2eMode()) {
      setE2eStatus(syncLabTransportMode() === 'p2p' ? 'sync-lab-p2p' : 'sync-lab-relay');
    }
  }

  /** Legacy Cloudflare Worker WebSocket path (plan Phase 4). */
  private createRelay(): void {
    const url = relayWsUrl();
    const dev = import.meta.env.DEV;
    const hasRelayUrl = url.length > 0;
    this.add
      .text(this.scale.width / 2, 40, 'Clock sync lab (NTP-style)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5);

    this.add
      .text(
        this.scale.width / 2,
        78,
        url ? `WS: ${url}` : 'Set VITE_RELAY_WS for production relay',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#778899',
          align: 'center',
          wordWrap: { width: this.scale.width - 40 },
        },
      )
      .setOrigin(0.5);

    const body = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 - 20,
        url || import.meta.env.DEV
          ? 'SPACE — connect and run 10 samples\nR — title'
          : 'Configure relay URL to run samples.',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          color: '#aabbcc',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    this.events.once('shutdown', () => {
      this.ws?.close();
      this.ws = null;
    });

    let running = false;
    const runSamples = async (): Promise<void> => {
      if (running) {
        return;
      }
      if (!url && !import.meta.env.DEV) {
        return;
      }
      running = true;
      const targetUrl = url || 'ws://127.0.0.1:8787';
      body.setText('Connecting…');
      try {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          try {
            this.ws.close();
          } catch {
            /* ignore */
          }
          this.ws = null;
        }
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          await new Promise<void>((resolve, reject) => {
            try {
              const socket = new WebSocket(targetUrl);
              this.ws = socket;
              socket.onopen = () => {
                socket.onclose = (ev: CloseEvent) => {
                  if (this.ws === socket) {
                    this.ws = null;
                    body.setText(
                      `${describeWebSocketClose(ev.code, ev.reason)}\n\nSPACE — reconnect  •  R — title`,
                    );
                  }
                };
                resolve();
              };
              socket.onerror = () => reject(new Error('WebSocket error'));
            } catch (e) {
              reject(e instanceof Error ? e : new Error(String(e)));
            }
          });
        }

        const ws = this.ws;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          body.setText('Not connected.');
          return;
        }

        let ema: number | null = null;
        const alpha = 0.35;
        const lines: string[] = [];
        const offsets: number[] = [];

        for (let i = 0; i < 10; i += 1) {
          const id = crypto.randomUUID();
          const t1 = Date.now();
          const ping: SyncPingV1 = { type: 'ping', id, t1 };

          const pong = await new Promise<SyncPongV1 | null>((resolve, reject) => {
            const timer = window.setTimeout(() => {
              ws.removeEventListener('message', onMsg);
              reject(new Error('pong timeout'));
            }, 5000);
            const onMsg = (ev: MessageEvent): void => {
              const p = parseSyncPongV1(String(ev.data));
              if (p && p.id === id) {
                window.clearTimeout(timer);
                ws.removeEventListener('message', onMsg);
                resolve(p);
              }
            };
            ws.addEventListener('message', onMsg);
            ws.send(stringifySyncPingV1(ping));
          });

          if (!pong) {
            break;
          }
          const t4 = Date.now();
          if (pong.t1 !== t1) {
            lines.push(`sample ${i + 1}: t1 mismatch`);
            continue;
          }
          const offset = ntpOffsetMs(t1, pong.t2, pong.t3, t4);
          const rtt = ntpRttMs(t1, pong.t2, pong.t3, t4);
          offsets.push(offset);
          ema = emaAlpha(ema, offset, alpha);
          const emaStr = ema === null ? '—' : ema.toFixed(1);
          lines.push(
            `#${i + 1}  offset ${offset.toFixed(1)} ms  RTT ${rtt.toFixed(1)} ms  EMA ${emaStr} ms`,
          );
          const unstable = isOffsetUnstable(offsets, 15);
          if (unstable) {
            lines.push('(sample spread > 15 ms — unstable)');
          }
          body.setText(`${lines.join('\n')}\n\nSPACE — again  •  R — title`);
        }
      } finally {
        running = false;
      }
    };

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'KeyR') {
        this.scene.start('TitleScene');
        return;
      }
      if (ev.code === 'Space') {
        void runSamples().catch((err: unknown) => {
          body.setText(`${formatSyncLabUserError(err, { dev, hasRelayUrl })}\nR — title`);
        });
      }
    });
  }

  /** P2P spike: hyperswarm-web echo (PRD P0). */
  private createP2p(): void {
    const dev = import.meta.env.DEV;
    const raw = import.meta.env.VITE_P2P_BOOTSTRAP;
    const parsed = parseViteP2PBootstrap(typeof raw === 'string' ? raw : undefined);
    const topic = syncLabP2pTopicLabel();
    const bootstrapLine = parsed.ok
      ? `bootstrap: ${parsed.urls.join(', ')}`
      : `bootstrap: ${parsed.message}`;

    this.add
      .text(this.scale.width / 2, 32, 'Clock sync lab (P2P)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5);

    this.add
      .text(this.scale.width / 2, 64, `topic: ${topic}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#8899aa',
        align: 'center',
        wordWrap: { width: this.scale.width - 40 },
      })
      .setOrigin(0.5);

    this.add
      .text(this.scale.width / 2, 88, bootstrapLine, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: parsed.ok ? '#778899' : '#cc8866',
        align: 'center',
        wordWrap: { width: this.scale.width - 40 },
      })
      .setOrigin(0.5);

    const body = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 - 10,
        parsed.ok
          ? 'SPACE — run 10 NTP samples  •  C — copy join link  •  N — new random topic\n(open 2 tabs with same topic)  •  R — title'
          : 'Fix VITE_P2P_BOOTSTRAP in .env.local (see README).\nR — title',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          color: '#aabbcc',
          align: 'center',
          wordWrap: { width: this.scale.width - 40 },
        },
      )
      .setOrigin(0.5);

    let running = false;

    this.input.keyboard?.on('keydown', (ev: KeyboardEvent) => {
      if (ev.code === 'KeyR') {
        this.scene.start('TitleScene');
        return;
      }
      if (ev.code === 'KeyN' && parsed.ok) {
        const next = randomTopicHex(16);
        window.location.assign(syncLabP2pShareUrl(window.location.href, next));
        return;
      }
      if (ev.code === 'KeyC' && parsed.ok) {
        const url = syncLabP2pShareUrl(window.location.href, topic);
        void navigator.clipboard.writeText(url).then(
          () => {
            body.setText(
              `Copied join link (${url.length} chars).\n\nSPACE — run samples  •  C — copy again  •  N — new topic  •  R — title`,
            );
          },
          () => {
            body.setText(
              `Copy failed — select topic in the address bar manually.\n\n${url}\n\nR — title`,
            );
          },
        );
        return;
      }
      if (ev.code === 'Space') {
        if (running || !parsed.ok) {
          return;
        }
        running = true;
        const lines: string[] = [];
        void import('@/p2p/syncLabP2p')
          .then(({ runSyncLabP2pNtpProbe }) =>
            runSyncLabP2pNtpProbe({
              topicLabel: topic,
              onLog: (line) => {
                lines.push(line);
                body.setText(
                  `${lines.join('\n')}\n\nSPACE — again  •  C — copy link  •  N — new topic  •  R — title`,
                );
              },
            }),
          )
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            let text = `${msg}\n\nR — title`;
            if (msg.includes('VITE_P2P_BOOTSTRAP') || msg.includes('not set')) {
              text = `${formatP2PSyncLabUserError('bootstrap_missing', { dev })}\nR — title`;
            } else if (
              msg.includes('peer timeout') ||
              msg.includes('no connection') ||
              msg.includes('pong timeout')
            ) {
              text = `${formatP2PSyncLabUserError('peer_timeout', { dev })}\nR — title`;
            } else if (msg.includes('ICE') || msg.includes('ice')) {
              text = `${formatP2PSyncLabUserError('ice_failed', { dev })}\nR — title`;
            }
            body.setText(text);
          })
          .finally(() => {
            running = false;
          });
      }
    });
  }
}
