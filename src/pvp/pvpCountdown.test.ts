import { describe, expect, it } from 'vitest';

import { countdownDigitFromRemainingMs } from '@/pvp/pvpCountdown';

describe('countdownDigitFromRemainingMs', () => {
  const lead = 4000;

  it('shows 3 at start of window', () => {
    expect(countdownDigitFromRemainingMs(4000, lead)).toBe('3');
  });

  it('shows 2 after one second elapsed', () => {
    expect(countdownDigitFromRemainingMs(2999, lead)).toBe('2');
  });

  it('shows empty when time is up', () => {
    expect(countdownDigitFromRemainingMs(0, lead)).toBe('');
  });
});
