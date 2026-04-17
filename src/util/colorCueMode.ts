const STORAGE_KEY = 'atdance-color-cue-mode';

/** Standard Konami sequence (keyboard `code` values). */
export const KONAMI_KEY_CODES: readonly string[] = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
];

export function getColorCueModeEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setColorCueModeEnabled(on: boolean): void {
  try {
    if (on) {
      globalThis.localStorage?.setItem(STORAGE_KEY, '1');
    } else {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    }
  } catch {
    /* private mode / quota */
  }
}

export function advanceKonamiProgress(
  index: number,
  keyCode: string,
): { nextIndex: number; unlocked: boolean } {
  if (keyCode === KONAMI_KEY_CODES[index]) {
    const next = index + 1;
    if (next >= KONAMI_KEY_CODES.length) {
      return { nextIndex: 0, unlocked: true };
    }
    return { nextIndex: next, unlocked: false };
  }
  if (keyCode === KONAMI_KEY_CODES[0]) {
    return { nextIndex: 1, unlocked: false };
  }
  return { nextIndex: 0, unlocked: false };
}
