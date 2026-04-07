/** Namespace browser storage keys per ATProto DID (PRD §5). */
export function magnetsKeyForDid(did: string): string {
  return `atdance.magnets.v1::${encodeURIComponent(did)}`;
}

export function songPriorityKeyForDid(did: string): string {
  return `atdance.songPriority.v1::${encodeURIComponent(did)}`;
}

/** Serialized `PeerRttEntry[]` for PRD §7 (idb-keyval). */
export function peerRttKeyForDid(did: string): string {
  return `atdance.peerRtt.v1::${encodeURIComponent(did)}`;
}
