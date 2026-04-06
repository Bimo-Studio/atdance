import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CALIBRATION_STORAGE_KEY,
  getCalibrationOffsetSec,
  setCalibrationOffsetSec,
} from '@/calibration/storage';

describe('calibration storage', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in store ? store[k]! : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
    } as Storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('roundtrips offset', () => {
    setCalibrationOffsetSec(0.042);
    expect(getCalibrationOffsetSec()).toBeCloseTo(0.042);
  });

  it('returns 0 when missing', () => {
    expect(getCalibrationOffsetSec()).toBe(0);
  });

  it('handles invalid string', () => {
    localStorage.setItem(CALIBRATION_STORAGE_KEY, 'nope');
    expect(getCalibrationOffsetSec()).toBe(0);
  });
});
