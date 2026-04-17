import { describe, expect, it } from 'vitest';

import { isMagentaChromaKeyRgb } from '@/util/magentaChromaKey';

describe('isMagentaChromaKeyRgb', () => {
  it('keys pure magenta and typical fringes', () => {
    expect(isMagentaChromaKeyRgb(255, 0, 255)).toBe(true);
    expect(isMagentaChromaKeyRgb(255, 80, 255)).toBe(true);
    expect(isMagentaChromaKeyRgb(230, 95, 230)).toBe(true);
  });

  it('does not key gray arrow fill', () => {
    expect(isMagentaChromaKeyRgb(242, 242, 242)).toBe(false);
  });

  it('does not key white or primaries', () => {
    expect(isMagentaChromaKeyRgb(255, 255, 255)).toBe(false);
    expect(isMagentaChromaKeyRgb(255, 255, 0)).toBe(false);
    expect(isMagentaChromaKeyRgb(0, 255, 0)).toBe(false);
  });
});
