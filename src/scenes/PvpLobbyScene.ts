import Phaser from 'phaser';

import type { EchoDuplex } from '@/p2p/p2pEchoHandshake';
import { getAtprotoOAuthSession } from '@/auth/atprotoSession';
import { fetchBskyHandleForDid } from '@/bsky/publicAppview';
import { requirePlaySession } from '@/auth/requirePlaySession';
import { agreeChartFromOffers, type ChartOfferInput } from '@/pvp/chartAgreement';
import { agreeStartAtUnixMs } from '@/pvp/agreeStartTime';
import { shouldUseAudioProof } from '@/pvp/epochUncertainty';
import { LOBBY_LAYOUT } from '@/pvp/lobbyLayout';
import { evaluateMatchQuality, rttJitterStdMs } from '@/pvp/matchQuality';
import { nextLobbyState, type PvpLobbyState } from '@/pvp/lobbyState';
import { loadPeerRttTableForDid, savePeerRttTableForDid } from '@/pvp/peerRttTablePersistence';
import { PeerRttTable } from '@/pvp/peerRttTable';
import { isP2PBootstrapConfigured } from '@/pvp/pvpDiscovery';
import type { PvpMessageV1 } from '@/pvp/pvpMessageV1';
import { isPvpMatchmakingConfigured } from '@/pvp/pvpMatchmakingEnv';
import { connectPvpRelaySession, type PvpRelaySession } from '@/pvp/pvpRelaySession';
import { getPvpRelayWsUrl } from '@/pvp/pvpRelayQueue';
import { countdownDigitFromRemainingMs } from '@/pvp/pvpCountdown';
import { syntheticOffsetSamplesFromRttMs } from '@/pvp/probeOffsets';
import { MockProbeTransport, type ProbeTransport } from '@/pvp/probeTransport';
import { RelayProbeTransport, tryRespondToPvpProbe } from '@/pvp/relayProbeTransport';
import { P2PProbeTransport } from '@/pvp/p2pProbeTransport';
import { loadSongPriority, type SongPriorityState } from '@/pvp/songPriorityStore';
import {
  isE2eMode,
  isE2ePvpHighRtt,
  setE2ePvpLobbyPhase,
  setE2ePvpProbeOutcome,
} from '@/util/e2eFlags';
import { formatAccountFooterLine } from '@/util/accountDisplay';
import { getStorageDid } from '@/util/storageDid';

/** Synthetic peer id for RTT probe when relay did not supply `peerPlayerDid` (solo / dev queue). */
const PROBE_PEER_DID_FALLBACK = 'did:web:atdance.probe-peer';
const PVP_DEFAULT_CHART_URL = '/songs/synrg/synrg.dance';
const PROBE_SAMPLES = 10;
const COUNTDOWN_LEAD_MS = 4000;
const CHART_NEGOTIATION_MS = 3000;
const FALLBACK_OFFSET_STUBS = [12, 13, 12, 14, 11] as const;

/**
 * PvP lobby: side-by-side shell, RTT probe gate → ready → countdown → shared play scene (PRD P2–P6).
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
  private relaySession: PvpRelaySession | null = null;
  private relayClientId = '';
  private peerPlayerDid: string | null = null;
  private opponentTitleText!: Phaser.GameObjects.Text;
  private songPriority!: SongPriorityState;
  private localChartOffer: ChartOfferInput | null = null;
  private peerChartOffer: ChartOfferInput | null = null;
  private agreedChartUrl = '';
  /** When true, lobby hands off to PlayScene and must not close the relay socket. */
  private leavingForPvpPlay = false;
  private accountFooter!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PvpLobbyScene' });
  }

  create(): void {
    if (!requirePlaySession(this)) {
      return;
    }

    this.leavingForPvpPlay = false;
    const session = getAtprotoOAuthSession();
    this.storageDid =
      getStorageDid() || (session?.sub?.startsWith('did:') ? session.sub : 'did:web:unknown.local');
    this.peerRttTable = new PeerRttTable();

    void this.bootstrapLobby();
  }

  private async bootstrapLobby(): Promise<void> {
    const [loadedRtt, priority] = await Promise.all([
      loadPeerRttTableForDid(this.storageDid, Date.now()),
      loadSongPriority(this.storageDid),
    ]);
    this.peerRttTable = loadedRtt;
    this.songPriority = priority;

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

    this.opponentTitleText = this.add
      .text(half + half / 2, 120, 'Opponent', {
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

    this.accountFooter = this.add
      .text(16, this.scale.height - 28, formatAccountFooterLine(this.storageDid, null), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        color: '#556677',
      })
      .setOrigin(0, 0.5);

    void fetchBskyHandleForDid(this.storageDid).then((handle) => {
      if (!this.accountFooter.active) {
        return;
      }
      this.accountFooter.setText(formatAccountFooterLine(this.storageDid, handle));
    });

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
      this.relaySession = connectPvpRelaySession({
        relayWsUrl: relayUrl,
        clientId: this.relayClientId,
        playerDid: this.storageDid,
        onPaired: (msg) => {
          const d = msg.peerPlayerDid?.trim();
          this.peerPlayerDid = d !== undefined && d.length > 0 ? d : null;
          this.refreshOpponentTitle();
          this.tryBeginPairingFromRelay();
        },
        onError: (code) => {
          if (import.meta.env.DEV) {
            console.warn('[PvP] relay queue error', code);
          }
        },
      });
    }

    if (!isPvpMatchmakingConfigured()) {
      this.statusNote =
        '— Matchmaking unavailable: configure VITE_RELAY_WS and run the relay, set VITE_PVP_P2P_PROBE or VITE_P2P_BOOTSTRAP, or play solo from Song Select (see docs/deployment-shoestring.md).';
      this.refreshHud();
    } else {
      this.stubPairTimer = this.time.delayedCall(120, () => {
        this.tryBeginPairingFromStub();
      });
    }

    this.input.keyboard?.on('keydown-SPACE', this.onSpace, this);
    this.input.keyboard?.once('keydown-ESC', () => {
      this.cleanupTimers();
      this.relaySession?.close();
      this.relaySession = null;
      this.scene.start('TitleScene');
    });

    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-SPACE', this.onSpace, this);
      this.cleanupTimers();
      if (!this.leavingForPvpPlay) {
        this.relaySession?.close();
      }
      this.relaySession = null;
      this.countdownLabel?.destroy();
      this.countdownLabel = null;
    });
  }

  private buildLocalChartOffer(): ChartOfferInput {
    for (let i = 0; i < 3; i += 1) {
      const slot = this.songPriority.slots[i];
      const url = slot?.chartUrl?.trim();
      if (url !== undefined && url.length > 0) {
        return {
          chartUrl: url,
          preferenceRank: i,
          tieBreakId: this.relayClientId,
        };
      }
    }
    return {
      chartUrl: PVP_DEFAULT_CHART_URL,
      preferenceRank: 99,
      tieBreakId: this.relayClientId,
    };
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
    this.relaySession?.close();
    this.relaySession = null;
    this.peerPlayerDid = null;
    this.refreshOpponentTitle();
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
    const rId = this.relaySession?.getRoomId();
    if (this.relaySession !== null && rId !== null && rId !== '') {
      return new RelayProbeTransport(this.relaySession);
    }
    return new MockProbeTransport({ fixedMs: 85 });
  }

  private probeTargetDid(): string {
    const d = this.peerPlayerDid?.trim();
    if (d !== undefined && d.length > 0 && d.startsWith('did:')) {
      return d;
    }
    return PROBE_PEER_DID_FALLBACK;
  }

  private refreshOpponentTitle(): void {
    const d = this.peerPlayerDid?.trim();
    if (d !== undefined && d.length > 0) {
      const short = d.length > 40 ? `${d.slice(0, 32)}…` : d;
      this.opponentTitleText.setText(`Opponent · ${short}`);
    } else {
      this.opponentTitleText.setText('Opponent (local match)');
    }
  }

  private startChartNegotiation(): void {
    const local = this.buildLocalChartOffer();
    this.localChartOffer = local;
    this.peerChartOffer = null;
    this.agreedChartUrl = '';

    const roomId = this.relaySession?.getRoomId();
    if (this.relaySession !== null && roomId !== null && roomId !== '') {
      const session = this.relaySession;
      this.relaySession.setOnPvpMessage((m) => {
        if (tryRespondToPvpProbe(session, m)) {
          return;
        }
        this.onLobbyPvpMessage(m);
      });
      this.relaySession.sendPvp({
        type: 'pvp.v1.chartOffer',
        chartUrl: local.chartUrl,
        preferenceRank: local.preferenceRank,
        tieBreakId: local.tieBreakId,
      });
      const t = this.time.delayedCall(CHART_NEGOTIATION_MS, () => {
        this.finalizeChartNegotiation(true);
      });
      this.playTimers.push(t);
    } else {
      this.finalizeChartNegotiation(false);
    }
  }

  private onLobbyPvpMessage(msg: PvpMessageV1): void {
    if (msg.type !== 'pvp.v1.chartOffer') {
      return;
    }
    if (this.agreedChartUrl !== '') {
      return;
    }
    this.peerChartOffer = {
      chartUrl: msg.chartUrl,
      preferenceRank: msg.preferenceRank,
      tieBreakId: msg.tieBreakId,
    };
    if (this.localChartOffer !== null) {
      this.agreedChartUrl = agreeChartFromOffers(
        this.localChartOffer,
        this.peerChartOffer,
      ).chartUrl;
      this.relaySession?.sendPvp({ type: 'pvp.v1.chartAck', chartUrl: this.agreedChartUrl });
      this.refreshHud();
    }
  }

  private finalizeChartNegotiation(timedOut: boolean): void {
    if (this.agreedChartUrl !== '') {
      return;
    }
    if (this.localChartOffer !== null && this.peerChartOffer !== null) {
      this.agreedChartUrl = agreeChartFromOffers(
        this.localChartOffer,
        this.peerChartOffer,
      ).chartUrl;
    } else if (timedOut && this.relaySession?.getRoomId()) {
      this.agreedChartUrl = PVP_DEFAULT_CHART_URL;
      this.statusNote = '— chart: default (negotiation timeout)';
    } else {
      this.agreedChartUrl = this.localChartOffer?.chartUrl ?? PVP_DEFAULT_CHART_URL;
    }
    this.refreshHud();
  }

  private async runProbePhase(): Promise<void> {
    if (isE2eMode()) {
      setE2ePvpLobbyPhase('probing');
    }
    const transport = this.resolveProbeTransport();
    const probeDid = this.probeTargetDid();
    try {
      const samples = await transport.collectRttSamples(probeDid, PROBE_SAMPLES);
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
      this.peerRttTable.recordSample(probeDid, mean, jitter, Date.now());
      void savePeerRttTableForDid(this.storageDid, this.peerRttTable);
      this.lastProbeRttSamples = samples;

      this.applyLobbyTransition('probe_done');
      this.refreshHud();
      this.startChartNegotiation();
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
      this.time.delayedCall(450, () => {
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
        chartUrl: this.agreedChartUrl,
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
          this.startPlaySceneAfterCountdown();
        }
      },
    });
    this.playTimers.push(tick);
  }

  private startPlaySceneAfterCountdown(): void {
    if (isE2eMode()) {
      setE2ePvpLobbyPhase('play');
    }

    const chartUrl = this.agreedChartUrl !== '' ? this.agreedChartUrl : PVP_DEFAULT_CHART_URL;
    const relay = this.relaySession;
    const remoteHudRef = relay !== null ? { combo: 0, miss: 0, score: 0 } : undefined;

    if (relay !== null) {
      relay.setOnPvpMessage((msg) => {
        if (tryRespondToPvpProbe(relay, msg)) {
          return;
        }
        if (msg.type !== 'pvp.v1.scoreTick' || remoteHudRef === undefined) {
          return;
        }
        remoteHudRef.combo = msg.combo;
        remoteHudRef.miss = msg.miss;
        remoteHudRef.score = msg.score ?? 0;
      });
    }

    const sendPvp =
      relay !== null
        ? (m: PvpMessageV1) => {
            relay.sendPvp(m);
          }
        : undefined;
    const closeRelay =
      relay !== null
        ? () => {
            relay.close();
          }
        : undefined;

    this.leavingForPvpPlay = true;
    this.relaySession = null;
    this.cleanupTimers();
    this.scene.start('PlayScene', {
      chartUrl,
      pvp: {
        agreedStartAtUnixMs: this.agreedStartAtUnixMs,
        autoStartAudio: true,
        sendPvp,
        remoteHudRef,
        closeRelay,
      },
    });
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
  }

  private refreshHud(): void {
    let extra = '';
    if (this.lobbyState === 'lobby' && this.localReady) {
      extra = ' — you ready, waiting for opponent…';
    }
    const chartHint =
      this.agreedChartUrl !== '' ? `  ·  chart: ${this.shortChartLabel(this.agreedChartUrl)}` : '';
    const note = this.statusNote ? ` ${this.statusNote}` : '';
    this.status.setText(`State: ${this.lobbyState}${extra}${chartHint}${note}`);
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

  private shortChartLabel(chartUrl: string): string {
    const m = /\/songs\/([^/]+)\//.exec(chartUrl);
    return m?.[1] ?? chartUrl.slice(0, 24);
  }
}
