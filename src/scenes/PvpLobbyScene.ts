import Phaser from 'phaser';

import type { EchoDuplex } from '@/p2p/p2pEchoHandshake';
import { getAtprotoOAuthSession } from '@/auth/atprotoSession';
import { requirePlaySession } from '@/auth/requirePlaySession';
import { agreeStartAtUnixMs } from '@/pvp/agreeStartTime';
import { shouldUseAudioProof } from '@/pvp/epochUncertainty';
import { LOBBY_LAYOUT } from '@/pvp/lobbyLayout';
import { evaluateMatchQuality, rttJitterStdMs } from '@/pvp/matchQuality';
import { MockPvpRemote } from '@/pvp/mockPvpRemote';
import { P2PProbeTransport } from '@/pvp/p2pProbeTransport';
import { nextLobbyState, type PvpLobbyState } from '@/pvp/lobbyState';
import { loadPeerRttTableForDid, savePeerRttTableForDid } from '@/pvp/peerRttTablePersistence';
import { PeerRttTable } from '@/pvp/peerRttTable';
import { isP2PBootstrapConfigured } from '@/pvp/pvpDiscovery';
import {
  connectPvpRelayQueue,
  getPvpRelayWsUrl,
  type PvpRelayQueueSession,
} from '@/pvp/pvpRelayQueue';
import { countdownDigitFromRemainingMs } from '@/pvp/pvpCountdown';
import { syntheticOffsetSamplesFromRttMs } from '@/pvp/probeOffsets';
import { MockProbeTransport, type ProbeTransport } from '@/pvp/probeTransport';
import {
  isE2eMode,
  isE2ePvpHighRtt,
  setE2ePvpLobbyPhase,
  setE2ePvpProbeOutcome,
} from '@/util/e2eFlags';
import { getStorageDid } from '@/util/storageDid';

const STUB_PEER_DID = 'did:web:stub.opponent';
const PROBE_SAMPLES = 10;
const COUNTDOWN_LEAD_MS = 4000;
const FALLBACK_OFFSET_STUBS = [12, 13, 12, 14, 11] as const;

/**
 * PvP lobby: side-by-side shell, stub peer, RTT probe gate → ready → countdown → stub play (PRD P2–P3).
 */
export class PvpLobbyScene extends Phaser.Scene {
  private lobbyState: PvpLobbyState = 'idle';
  private status!: Phaser.GameObjects.Text;
  private localHud!: Phaser.GameObjects.Text;
  private remoteHud!: Phaser.GameObjects.Text;
  private localReady = false;
  private localCombo = 0;
  private localMiss = 0;
  private remoteCombo = 0;
  private remoteMiss = 0;
  private mockRemote!: MockPvpRemote;
  private playTimers: Phaser.Time.TimerEvent[] = [];
  private countdownLabel: Phaser.GameObjects.Text | null = null;
  private peerRttTable!: PeerRttTable;
  private storageDid = '';
  /** E2E: first round fails RTT, second succeeds. */
  private probeRound = 0;
  private statusNote = '';
  /** Optional P2P duplex when `VITE_PVP_P2P_PROBE=1` and wired elsewhere (P3.5b). */
  private p2pProbeDuplex: EchoDuplex | undefined;
  private clockSyncMode: 'shared_epoch' | 'audio_proof' = 'shared_epoch';
  private agreedStartAtUnixMs = 0;
  private lastProbeRttSamples: readonly number[] = [];
  private pairingResolved = false;
  private stubPairTimer: Phaser.Time.TimerEvent | null = null;
  private relayQueue: PvpRelayQueueSession | null = null;
  private relayClientId = '';

  constructor() {
    super({ key: 'PvpLobbyScene' });
  }

  create(): void {
    if (!requirePlaySession(this)) {
      return;
    }

    const session = getAtprotoOAuthSession();
    this.storageDid =
      getStorageDid() || (session?.sub?.startsWith('did:') ? session.sub : 'did:web:unknown.local');
    this.peerRttTable = new PeerRttTable();
    this.mockRemote = new MockPvpRemote(this);

    void this.bootstrapLobby();
  }

  private async bootstrapLobby(): Promise<void> {
    this.peerRttTable = await loadPeerRttTableForDid(this.storageDid, Date.now());

    this.applyLobbyTransition('enter_queue');

    this.add
      .text(this.scale.width / 2, LOBBY_LAYOUT.titleY, 'PvP lobby', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5);

    this.status = this.add
      .text(this.scale.width / 2, 88, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#8899aa',
        align: 'center',
      })
      .setOrigin(0.5);

    const half = this.scale.width / 2;
    const pw = half - LOBBY_LAYOUT.marginX * 2;
    this.add
      .rectangle(
        half / 2,
        LOBBY_LAYOUT.panelCenterY,
        pw,
        LOBBY_LAYOUT.panelHeight,
        LOBBY_LAYOUT.panelFill,
        0.92,
      )
      .setStrokeStyle(2, LOBBY_LAYOUT.localStroke);
    this.add
      .rectangle(
        half + half / 2,
        LOBBY_LAYOUT.panelCenterY,
        pw,
        LOBBY_LAYOUT.panelHeight,
        LOBBY_LAYOUT.panelFill,
        0.92,
      )
      .setStrokeStyle(2, LOBBY_LAYOUT.remoteStroke);

    this.add
      .text(half / 2, 120, 'You (local)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: `#${LOBBY_LAYOUT.localStroke.toString(16)}`,
      })
      .setOrigin(0.5);

    this.add
      .text(half + half / 2, 120, 'Opponent (stub)', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: `#${LOBBY_LAYOUT.remoteStroke.toString(16)}`,
      })
      .setOrigin(0.5);

    this.localHud = this.add
      .text(half / 2, LOBBY_LAYOUT.hudYOffset, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#aabbcc',
        align: 'center',
      })
      .setOrigin(0.5);

    this.remoteHud = this.add
      .text(half + half / 2, LOBBY_LAYOUT.hudYOffset, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#aabbcc',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(
        16,
        this.scale.height - 28,
        `Account: ${this.storageDid.length > 36 ? `${this.storageDid.slice(0, 28)}…` : this.storageDid}`,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          color: '#556677',
        },
      )
      .setOrigin(0, 0.5);

    this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 44,
        'SPACE — Ready (in lobby)  •  ESC — back to title',
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: '#667788',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    this.refreshHud();

    if (import.meta.env.DEV && isP2PBootstrapConfigured()) {
      console.info(
        JSON.stringify({
          ts: new Date().toISOString(),
          svc: 'client',
          evt: 'p2p_discovery_bootstrap',
          phase: 'queue',
        }),
      );
    }

    this.relayClientId =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `pvp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const relayUrl = getPvpRelayWsUrl();
    if (relayUrl !== '') {
      this.relayQueue = connectPvpRelayQueue({
        relayWsUrl: relayUrl,
        clientId: this.relayClientId,
        playerDid: this.storageDid,
        onPaired: () => {
          this.tryBeginPairingFromRelay();
        },
        onError: (code) => {
          if (import.meta.env.DEV) {
            console.warn('[PvP] relay queue error', code);
          }
        },
      });
    }

    this.stubPairTimer = this.time.delayedCall(120, () => {
      this.tryBeginPairingFromStub();
    });

    this.input.keyboard?.on('keydown-SPACE', this.onSpace, this);
    this.input.keyboard?.once('keydown-ESC', () => {
      this.cleanupTimers();
      this.scene.start('TitleScene');
    });

    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-SPACE', this.onSpace, this);
      this.cleanupTimers();
      this.relayQueue?.close();
      this.relayQueue = null;
      this.countdownLabel?.destroy();
      this.countdownLabel = null;
    });
  }

  private tryBeginPairingFromRelay(): void {
    if (this.pairingResolved) {
      return;
    }
    this.pairingResolved = true;
    if (this.stubPairTimer !== null) {
      this.stubPairTimer.destroy();
      this.stubPairTimer = null;
    }
    this.relayQueue?.close();
    this.relayQueue = null;
    if (import.meta.env.DEV) {
      console.debug('[PvP] paired via relay queue');
    }
    this.beginStubPairing();
  }

  private tryBeginPairingFromStub(): void {
    if (this.pairingResolved) {
      return;
    }
    this.pairingResolved = true;
    this.stubPairTimer = null;
    this.relayQueue?.close();
    this.relayQueue = null;
    this.beginStubPairing();
  }

  private beginStubPairing(): void {
    this.statusNote = '';
    this.applyLobbyTransition('pair_found');
    this.refreshHud();
    void this.runProbePhase();
  }

  private resolveProbeTransport(): ProbeTransport {
    if (isE2ePvpHighRtt()) {
      const ms = this.probeRound === 0 ? 200 : 85;
      return new MockProbeTransport({ fixedMs: ms });
    }
    if (import.meta.env.VITE_PVP_P2P_PROBE === '1') {
      if (this.p2pProbeDuplex !== undefined) {
        return new P2PProbeTransport(this.p2pProbeDuplex);
      }
      console.warn('[PvP] VITE_PVP_P2P_PROBE is set but no duplex — using mock RTT');
    }
    return new MockProbeTransport({ fixedMs: 85 });
  }

  private async runProbePhase(): Promise<void> {
    if (isE2eMode()) {
      setE2ePvpLobbyPhase('probing');
    }
    const transport = this.resolveProbeTransport();
    try {
      const samples = await transport.collectRttSamples(STUB_PEER_DID, PROBE_SAMPLES);
      const mq = evaluateMatchQuality(samples);
      if (isE2eMode()) {
        setE2ePvpProbeOutcome(mq.accept ? 'accept' : 'reject', this.probeRound);
      }
      if (!mq.accept) {
        this.probeRound += 1;
        this.statusNote = '— looking for a closer partner…';
        this.applyLobbyTransition('cancel');
        this.applyLobbyTransition('enter_queue');
        this.refreshHud();
        this.time.delayedCall(500, () => {
          this.beginStubPairing();
        });
        return;
      }

      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      const jitter = rttJitterStdMs(samples);
      this.peerRttTable.recordSample(STUB_PEER_DID, mean, jitter, Date.now());
      void savePeerRttTableForDid(this.storageDid, this.peerRttTable);
      this.lastProbeRttSamples = samples;

      this.applyLobbyTransition('probe_done');
      this.refreshHud();
    } catch (e) {
      console.error('[PvP] probe failed', e);
      this.statusNote = '— probe error, retrying…';
      this.applyLobbyTransition('cancel');
      this.applyLobbyTransition('enter_queue');
      this.refreshHud();
      this.time.delayedCall(800, () => {
        this.beginStubPairing();
      });
    }
  }

  private onSpace = (): void => {
    if (this.lobbyState === 'lobby' && !this.localReady) {
      this.localReady = true;
      this.refreshHud();
      this.mockRemote.scheduleRemoteReady(450, () => {
        this.applyLobbyTransition('both_ready');
        this.startCountdown();
      });
    }
  };

  private applyLobbyTransition(event: Parameters<typeof nextLobbyState>[1]): void {
    this.lobbyState = nextLobbyState(this.lobbyState, event);
  }

  private startCountdown(): void {
    const offsetSamples =
      this.lastProbeRttSamples.length > 0
        ? syntheticOffsetSamplesFromRttMs(this.lastProbeRttSamples)
        : [...FALLBACK_OFFSET_STUBS];
    this.clockSyncMode = shouldUseAudioProof(offsetSamples) ? 'audio_proof' : 'shared_epoch';
    const now = Date.now();
    this.agreedStartAtUnixMs = agreeStartAtUnixMs({
      nowUnixMs: now,
      leadInMs: COUNTDOWN_LEAD_MS,
    });
    if (import.meta.env.DEV) {
      console.debug('[PvP] countdown', {
        clockSyncMode: this.clockSyncMode,
        agreedStartAtUnixMs: this.agreedStartAtUnixMs,
      });
    }
    if (isE2eMode()) {
      setE2ePvpLobbyPhase('countdown');
    }
    const cx = this.scale.width / 2;
    const cy = 210;
    this.countdownLabel?.destroy();
    this.countdownLabel = this.add
      .text(
        cx,
        cy,
        countdownDigitFromRemainingMs(this.agreedStartAtUnixMs - now, COUNTDOWN_LEAD_MS),
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '56px',
          color: '#f0f0ff',
        },
      )
      .setOrigin(0.5);

    const label = this.countdownLabel;
    const tick = this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        const remaining = this.agreedStartAtUnixMs - Date.now();
        label?.setText(countdownDigitFromRemainingMs(remaining, COUNTDOWN_LEAD_MS));
        if (remaining <= 0) {
          tick.destroy();
          label?.destroy();
          this.countdownLabel = null;
          this.applyLobbyTransition('countdown_end');
          this.beginStubPlay();
        }
      },
    });
    this.playTimers.push(tick);
  }

  private beginStubPlay(): void {
    if (isE2eMode()) {
      setE2ePvpLobbyPhase('play');
    }
    this.localCombo = 0;
    this.localMiss = 0;
    this.remoteCombo = 0;
    this.remoteMiss = 0;

    const localEv = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        this.localCombo += 1;
        this.localMiss = Math.floor(this.localCombo / 8);
        this.refreshHud();
      },
    });
    this.playTimers.push(localEv);

    this.mockRemote.startScoreLoop(({ combo, miss }) => {
      this.remoteCombo = combo;
      this.remoteMiss = miss;
      this.refreshHud();
    });

    this.refreshHud();
  }

  private cleanupTimers(): void {
    if (this.stubPairTimer !== null) {
      this.stubPairTimer.destroy();
      this.stubPairTimer = null;
    }
    for (const t of this.playTimers) {
      t.destroy();
    }
    this.playTimers = [];
    this.mockRemote.destroy();
  }

  private refreshHud(): void {
    let extra = '';
    if (this.lobbyState === 'lobby' && this.localReady) {
      extra = ' — you ready, waiting for opponent…';
    }
    const note = this.statusNote ? ` ${this.statusNote}` : '';
    this.status.setText(`State: ${this.lobbyState}${extra}${note}`);
    this.localHud.setText(`combo ${this.localCombo}  ·  miss ${this.localMiss}`);
    this.remoteHud.setText(`combo ${this.remoteCombo}  ·  miss ${this.remoteMiss}`);
    if (!isE2eMode()) {
      return;
    }
    if (this.lobbyState === 'lobby') {
      setE2ePvpLobbyPhase('lobby');
    } else if (this.lobbyState === 'matchmaking') {
      setE2ePvpLobbyPhase('matching');
    } else if (this.lobbyState === 'probing') {
      setE2ePvpLobbyPhase('probing');
    } else if (this.lobbyState === 'play') {
      setE2ePvpLobbyPhase('play');
    } else if (this.lobbyState === 'end') {
      setE2ePvpLobbyPhase('end');
    }
  }
}
