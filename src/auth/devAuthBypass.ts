import { isE2eMode } from '@/util/e2eFlags';

/**
 * `VITE_DEV_SKIP_AUTH=1` only while running the Vite dev server (`import.meta.env.DEV`).
 * Production builds never enable this, even if the variable were set by mistake.
 */
export function isDevAuthBypass(): boolean {
  return import.meta.env.DEV === true && import.meta.env.VITE_DEV_SKIP_AUTH === '1';
}

/** Skip {@link requirePlaySession} and boot-time sign-in (E2E or dev bypass). */
export function skipAuthGate(): boolean {
  return isE2eMode() || isDevAuthBypass();
}
