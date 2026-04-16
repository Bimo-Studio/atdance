import { describe, expect, it } from 'vitest';

import {
  aggregateAtprotoSignInErrorText,
  formatAtprotoSignInErrorMessage,
  isLikelyAtprotoInfrastructureFailure,
} from '@/auth/atprotoSignInUserMessage';

describe('aggregateAtprotoSignInErrorText', () => {
  it('joins message and cause chain', () => {
    const inner = new TypeError('Failed to fetch');
    const outer = new Error('Failed to resolve identity: alice.test');
    outer.cause = inner;
    expect(aggregateAtprotoSignInErrorText(outer)).toContain('Failed to resolve identity');
    expect(aggregateAtprotoSignInErrorText(outer)).toContain('Failed to fetch');
  });
});

describe('isLikelyAtprotoInfrastructureFailure', () => {
  it('is true for typical browser network errors', () => {
    expect(isLikelyAtprotoInfrastructureFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(
      isLikelyAtprotoInfrastructureFailure(new Error('NetworkError when attempting to fetch')),
    ).toBe(true);
  });

  it('is true when only the cause is a network error', () => {
    const e = new Error('Failed to resolve identity: foo.test');
    e.cause = new TypeError('Failed to fetch');
    expect(isLikelyAtprotoInfrastructureFailure(e)).toBe(true);
  });

  it('is false for invalid handle style messages', () => {
    expect(isLikelyAtprotoInfrastructureFailure(new Error('Invalid handle "@x" provided.'))).toBe(
      false,
    );
    expect(
      isLikelyAtprotoInfrastructureFailure(
        new Error('Handle "nope.test" does not resolve to a DID'),
      ),
    ).toBe(false);
  });
});

describe('formatAtprotoSignInErrorMessage', () => {
  it('explains possible upstream issues for infrastructure-like errors', () => {
    const msg = formatAtprotoSignInErrorMessage(new TypeError('Failed to fetch'));
    expect(msg).toContain('could not reach ATProto or Bluesky');
    expect(msg).toContain('usually not something you can fix');
    expect(msg).toContain('Technical detail:');
  });

  it('uses a short failure line for other errors', () => {
    const msg = formatAtprotoSignInErrorMessage(new Error('Something went wrong'));
    expect(msg).toBe('Sign-in failed: Something went wrong');
  });

  it('uses infrastructure copy when only Error.cause is a network failure', () => {
    const e = new Error('Failed to resolve identity: example.test');
    e.cause = new TypeError('Failed to fetch');
    const msg = formatAtprotoSignInErrorMessage(e);
    expect(msg).toContain('could not reach ATProto or Bluesky');
    expect(msg).toContain('Failed to resolve identity');
  });
});
