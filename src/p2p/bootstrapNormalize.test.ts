import { describe, expect, it } from 'vitest';

import { normalizeHyperswarmBootstrapBases } from '@/p2p/bootstrapNormalize';

describe('normalizeHyperswarmBootstrapBases', () => {
  it('strips /proxy path to origin for hyperswarm-web base URLs', () => {
    expect(normalizeHyperswarmBootstrapBases(['wss://relay.example:4977/proxy'])).toEqual([
      'wss://relay.example:4977',
    ]);
  });

  it('leaves origin-only URLs unchanged', () => {
    expect(normalizeHyperswarmBootstrapBases(['ws://127.0.0.1:4977'])).toEqual([
      'ws://127.0.0.1:4977',
    ]);
  });
});
