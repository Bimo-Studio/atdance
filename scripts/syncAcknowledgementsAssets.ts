/**
 * Copies timidity WASM + FreePats instruments into public/midi-engine/ and
 * writes public/midi/midi-manifest.json listing every *.mid in public/midi/.
 * Invoked from Vite `buildStart` (dev + production build).
 *
 * Add .mid files under public/midi/ — they are served as /midi/*.mid and the
 * Acknowledgements scene picks one at random from the manifest.
 * Do not generate MIDI here; `credits.mid` is never included (ignored if present).
 */
import { cpSync, copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function rmDir(dir: string): void {
  try {
    rmSync(dir, { recursive: true });
  } catch {
    /* absent */
  }
}

/** Legacy / generated file — never listed for playback (user-supplied MIDIs only). */
const EXCLUDED_MIDI_BASENAMES = new Set(['credits.mid']);

function isUsableMidiBasename(name: string): boolean {
  if (!name.toLowerCase().endsWith('.mid')) {
    return false;
  }
  return !EXCLUDED_MIDI_BASENAMES.has(name.toLowerCase());
}

/** Sorted basenames of MIDI files in `midiDir` (non-recursive). */
export function discoverMidiTrackNames(midiDir: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(midiDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && isUsableMidiBasename(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
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

  const midiPublic = join(root, 'public/midi');
  mkdirSync(midiPublic, { recursive: true });
  const tracks = discoverMidiTrackNames(midiPublic);
  writeFileSync(
    join(midiPublic, 'midi-manifest.json'),
    `${JSON.stringify({ tracks }, null, 2)}\n`,
    'utf8',
  );
}
