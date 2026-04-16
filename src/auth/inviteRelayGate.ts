/** Tracks DIDs that passed {@link canPlayAsync} so {@link requirePlaySession} stays sync. */
const passed = new Set<string>();

export function markInviteRelayGatePassed(sub: string): void {
  const s = sub.trim();
  if (s.startsWith('did:')) {
    passed.add(s);
  }
}

export function hasPassedInviteRelayGate(sub: string): boolean {
  return passed.has(sub.trim());
}

export function clearInviteRelayGate(sub: string): void {
  passed.delete(sub.trim());
}

/** Test helper. */
export function resetInviteRelayGateForTests(): void {
  passed.clear();
}
