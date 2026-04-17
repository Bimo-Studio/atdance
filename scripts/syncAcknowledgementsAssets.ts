/**
 * Copies timidity WASM + FreePats instruments into public/midi-engine/ and
 * writes public/midi/credits.mid (deterministic short loop).
 * Invoked from Vite `buildStart` (dev + production build).
 */
import { copyFileSync, cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { MidiEvent } from 'midi-file';
import { writeMidi } from 'midi-file';

const root = fileURLToPath(new URL('..', import.meta.url));

function rmDir(dir: string): void {
  try {
    rmSync(dir, { recursive: true });
  } catch {
    /* absent */
  }
}

function writeCreditsMidi(outPath: string): void {
  const ticksPerBeat = 480;
  const step = Math.floor(ticksPerBeat / 8);
  const events: MidiEvent[] = [
    { deltaTime: 0, meta: true, type: 'setTempo', microsecondsPerBeat: 480_000 },
    { deltaTime: 0, meta: true, type: 'trackName', text: 'ATDance credits' },
    {
      deltaTime: 0,
      meta: true,
      type: 'timeSignature',
      numerator: 4,
      denominator: 4,
      metronome: 24,
      thirtyseconds: 8,
    },
    { deltaTime: 0, channel: 0, type: 'programChange', programNumber: 6 },
  ];
  const melody = [60, 64, 67, 72, 67, 64, 60, 62, 65, 69, 65, 62];
  for (const note of melody) {
    events.push({ deltaTime: 0, channel: 0, type: 'noteOn', noteNumber: note, velocity: 88 });
    events.push({
      deltaTime: step * 3,
      channel: 0,
      type: 'noteOff',
      noteNumber: note,
      velocity: 0,
    });
    events.push({
      deltaTime: step,
      channel: 0,
      type: 'noteOn',
      noteNumber: note + 12,
      velocity: 55,
    });
    events.push({
      deltaTime: step * 2,
      channel: 0,
      type: 'noteOff',
      noteNumber: note + 12,
      velocity: 0,
    });
    events.push({ deltaTime: step, channel: 0, type: 'noteOn', noteNumber: note, velocity: 44 });
    events.push({
      deltaTime: step * 2,
      channel: 0,
      type: 'noteOff',
      noteNumber: note,
      velocity: 0,
    });
  }
  events.push({ deltaTime: ticksPerBeat, meta: true, type: 'endOfTrack' });

  const midi = {
    header: { format: 0 as const, numTracks: 1, ticksPerBeat: ticksPerBeat },
    tracks: [events],
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(writeMidi(midi)));
}

export function syncAcknowledgementsAssets(): void {
  const timidityPkg = join(root, 'node_modules/timidity/package.json');
  const req = createRequire(timidityPkg);
  const timidityDir = dirname(req.resolve('timidity/package.json'));
  const freepatsDir = dirname(req.resolve('freepats/package.json'));

  const engineDest = join(root, 'public/midi-engine');
  rmDir(engineDest);
  mkdirSync(engineDest, { recursive: true });
  copyFileSync(join(timidityDir, 'libtimidity.wasm'), join(engineDest, 'libtimidity.wasm'));
  cpSync(join(freepatsDir, 'Drum_000'), join(engineDest, 'Drum_000'), { recursive: true });
  cpSync(join(freepatsDir, 'Tone_000'), join(engineDest, 'Tone_000'), { recursive: true });

  writeCreditsMidi(join(root, 'public/midi/credits.mid'));
}
