import { describe, expect, it, vi } from 'vitest';

import { AudioClock } from '@/audio/AudioClock';
import { AudioScheduler } from '@/audio/AudioScheduler';

describe('AudioClock', () => {
  it('reads currentTime from AudioContext', () => {
    const ctx = { currentTime: 1.25 } as AudioContext;
    const clock = new AudioClock(ctx);
    expect(clock.currentTimeSeconds).toBe(1.25);
  });
});

describe('AudioScheduler', () => {
  it('runs callbacks in order when due', () => {
    const s = new AudioScheduler();
    const order: string[] = [];
    s.schedule(0.1, () => order.push('a'));
    s.schedule(0.05, () => order.push('b'));
    s.tick(0.04);
    expect(order).toEqual([]);
    s.tick(0.06);
    expect(order).toEqual(['b']);
    s.tick(0.2);
    expect(order).toEqual(['b', 'a']);
  });

  it('clear removes pending work', () => {
    const s = new AudioScheduler();
    const fn = vi.fn();
    s.schedule(0, fn);
    s.clear();
    s.tick(100);
    expect(fn).not.toHaveBeenCalled();
  });
});
