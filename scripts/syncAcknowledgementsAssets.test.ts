import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { discoverMidiTrackNames } from './syncAcknowledgementsAssets';

describe('discoverMidiTrackNames', () => {
  it('returns sorted .mid basenames and ignores non-midi', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atdance-midi-'));
    try {
      writeFileSync(join(dir, 'b.mid'), '');
      writeFileSync(join(dir, 'a.mid'), '');
      writeFileSync(join(dir, 'readme.txt'), '');
      mkdirSync(join(dir, 'nested'));
      expect(discoverMidiTrackNames(dir)).toEqual(['a.mid', 'b.mid']);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('returns empty array when directory is missing', () => {
    expect(discoverMidiTrackNames(join(tmpdir(), 'atdance-midi-nope-not-here'))).toEqual([]);
  });

  it('never lists credits.mid', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atdance-midi-'));
    try {
      writeFileSync(join(dir, 'credits.mid'), '');
      writeFileSync(join(dir, 'song.mid'), '');
      expect(discoverMidiTrackNames(dir)).toEqual(['song.mid']);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
