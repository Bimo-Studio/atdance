import { describe, expect, it } from 'vitest';

import { oauthSignInWhatWeDo, oauthSignInWhatWeDoNot } from '@/auth/oauthSignInExplainerCopy';

describe('oauthSignInExplainerCopy', () => {
  it('lists what we do and what we do not (sign-in screen)', () => {
    expect(oauthSignInWhatWeDo.length).toBeGreaterThanOrEqual(5);
    expect(oauthSignInWhatWeDoNot.length).toBeGreaterThanOrEqual(4);
    expect(oauthSignInWhatWeDo.every((b) => b.title.length > 0 && b.body.length > 0)).toBe(true);
    expect(oauthSignInWhatWeDoNot.every((b) => b.title.length > 0 && b.body.length > 0)).toBe(true);
  });
});
