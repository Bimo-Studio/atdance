import { describe, expect, it } from 'vitest';

import { lineViolatesStubScan, violationsInSource } from './stubScan';

describe('lineViolatesStubScan', () => {
  it('flags TODO and variants', () => {
    expect(lineViolatesStubScan('// TODO: fix')).toBe(true);
    expect(lineViolatesStubScan(' * FIXME: here')).toBe(true);
    expect(lineViolatesStubScan('Return TBD')).toBe(true);
    expect(lineViolatesStubScan('throw new Error("not implemented")')).toBe(true);
    expect(lineViolatesStubScan('Not implemented yet')).toBe(true);
  });

  it('does not false-positive on substrings', () => {
    expect(lineViolatesStubScan('const x = "TODOUBLE"')).toBe(false);
    expect(lineViolatesStubScan('TODOUBLE')).toBe(false);
    expect(lineViolatesStubScan('// nothing here')).toBe(false);
  });
});

describe('violationsInSource', () => {
  it('returns empty for repo root (this project is clean)', () => {
    const v = violationsInSource(process.cwd());
    expect(v).toEqual([]);
  });
});
