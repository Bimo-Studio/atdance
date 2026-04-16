import { describe, expect, it } from 'vitest';

import {
  clearInviteRelayGate,
  hasPassedInviteRelayGate,
  markInviteRelayGatePassed,
  resetInviteRelayGateForTests,
} from '@/auth/inviteRelayGate';

describe('inviteRelayGate', () => {
  it('marks and checks DID', () => {
    resetInviteRelayGateForTests();
    expect(hasPassedInviteRelayGate('did:plc:x')).toBe(false);
    markInviteRelayGatePassed(' did:plc:x ');
    expect(hasPassedInviteRelayGate('did:plc:x')).toBe(true);
  });

  it('ignores non-did for mark', () => {
    resetInviteRelayGateForTests();
    markInviteRelayGatePassed('alice.test');
    expect(hasPassedInviteRelayGate('alice.test')).toBe(false);
  });

  it('clear removes DID', () => {
    resetInviteRelayGateForTests();
    markInviteRelayGatePassed('did:plc:a');
    clearInviteRelayGate('did:plc:a');
    expect(hasPassedInviteRelayGate('did:plc:a')).toBe(false);
  });
});
