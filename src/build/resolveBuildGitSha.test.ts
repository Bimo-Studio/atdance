import { describe, expect, it } from 'vitest';

import { resolveBuildGitSha } from '@/build/resolveBuildGitSha';

describe('resolveBuildGitSha', () => {
  it('uses Vercel full SHA (shortened)', () => {
    expect(
      resolveBuildGitSha(
        { VERCEL_GIT_COMMIT_SHA: 'a1b2c3d4e5f6789012345678901234567890abcd' },
        undefined,
      ),
    ).toBe('a1b2c3d');
  });

  it('uses Cloudflare Pages SHA', () => {
    expect(
      resolveBuildGitSha(
        { CF_PAGES_COMMIT_SHA: 'deadbeef00000000000000000000000000000000' },
        undefined,
      ),
    ).toBe('deadbee');
  });

  it('falls back to local git short rev when env empty', () => {
    expect(resolveBuildGitSha({}, '9f3e2a1')).toBe('9f3e2a1');
  });

  it('returns unknown when nothing valid', () => {
    expect(resolveBuildGitSha({}, undefined)).toBe('unknown');
    expect(resolveBuildGitSha({}, 'not-a-sha')).toBe('unknown');
  });
});
