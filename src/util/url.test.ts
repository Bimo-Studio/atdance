import { describe, expect, it } from 'vitest';

import { directoryOfUrl } from '@/util/url';

describe('directoryOfUrl', () => {
  it('strips filename', () => {
    expect(directoryOfUrl('/songs/synrg/synrg.dance')).toBe('/songs/synrg');
  });
  it('handles root-relative single segment', () => {
    expect(directoryOfUrl('/foo')).toBe('');
  });
});
