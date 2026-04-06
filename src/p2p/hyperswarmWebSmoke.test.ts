import { describe, expect, it } from 'vitest';

/**
 * P0.1 — proves `hyperswarm-web` resolves in the Vitest/Node toolchain (ESM interop).
 * Real WebRTC + join/echo is manual or mocked (see `docs/tasks-p2p-prd-test-matrix.md`).
 */
import createSwarm from 'hyperswarm-web';

describe('P0.1 hyperswarm-web dependency', () => {
  it('default export is a function (swarm factory)', () => {
    expect(typeof createSwarm).toBe('function');
  });

  it('constructs a swarm instance; join/leave exist before listen()', () => {
    const swarm = createSwarm({});
    expect(swarm).toBeDefined();
    expect(typeof swarm.join).toBe('function');
    expect(typeof swarm.leave).toBe('function');
    // Note: `destroy()` requires `listen()` first (initializes webrtc/ws); teardown is for integration tests.
  });
});
