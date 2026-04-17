import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  discoverMidiTrackNames,
  isMidiEngineBundleCurrent,
  writeTextFileIfChanged,
} from './syncAcknowledgementsAssets';

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

describe('writeTextFileIfChanged', () => {
  it('writes when file is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atdance-w-'));
    const p = join(dir, 'x.txt');
    try {
      writeTextFileIfChanged(p, 'a\n');
      expect(readFileSync(p, 'utf8')).toBe('a\n');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('does not rewrite when content matches', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atdance-w-'));
    const p = join(dir, 'x.txt');
    try {
      writeFileSync(p, 'same\n');
      const before = readFileSync(p, 'utf8');
      writeTextFileIfChanged(p, 'same\n');
      expect(readFileSync(p, 'utf8')).toBe(before);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('rewrites when content differs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atdance-w-'));
    const p = join(dir, 'x.txt');
    try {
      writeFileSync(p, 'old\n');
      writeTextFileIfChanged(p, 'new\n');
      expect(readFileSync(p, 'utf8')).toBe('new\n');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe('isMidiEngineBundleCurrent', () => {
  it('is false when wasm or instrument dirs are missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atdance-eng-'));
    const wasm = join(dir, 'libtimidity.wasm');
    try {
      writeFileSync(wasm, Buffer.from([1, 2, 3]));
      expect(isMidiEngineBundleCurrent(join(dir, 'dest'), wasm)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('is true when wasm bytes match and Tone_000 / Drum_000 exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atdance-eng-'));
    const dest = join(dir, 'midi-engine');
    const wasmBytes = Buffer.from([9, 8, 7]);
    try {
      mkdirSync(join(dest, 'Tone_000'), { recursive: true });
      mkdirSync(join(dest, 'Drum_000'), { recursive: true });
      writeFileSync(join(dest, 'libtimidity.wasm'), wasmBytes);
      const src = join(dir, 'src.wasm');
      writeFileSync(src, wasmBytes);
      expect(isMidiEngineBundleCurrent(dest, src)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('is false when wasm differs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atdance-eng-'));
    const dest = join(dir, 'midi-engine');
    try {
      mkdirSync(join(dest, 'Tone_000'), { recursive: true });
      mkdirSync(join(dest, 'Drum_000'), { recursive: true });
      writeFileSync(join(dest, 'libtimidity.wasm'), Buffer.from([1]));
      const src = join(dir, 'src.wasm');
      writeFileSync(src, Buffer.from([2]));
      expect(isMidiEngineBundleCurrent(dest, src)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
