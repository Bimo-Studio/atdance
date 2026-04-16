import { afterEach, describe, expect, it, vi } from 'vitest';

describe('devAuthBypass', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('skipAuthGate is true when e2e=1 (integration with e2eFlags)', async () => {
    vi.stubGlobal('window', {
      location: { search: '?e2e=1' },
    } as Window);
    const { skipAuthGate } = await import('./devAuthBypass');
    expect(skipAuthGate()).toBe(true);
  });

  it('skipAuthGate is false without e2e and without dev env stub', async () => {
    vi.stubGlobal('window', {
      location: { search: '' },
    } as Window);
    const { skipAuthGate } = await import('./devAuthBypass');
    expect(skipAuthGate()).toBe(false);
  });
});
