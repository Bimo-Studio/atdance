import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchBskyHandleForDid,
  fetchBskyPublicProfileForDid,
  resolveAtHandleToDid,
  searchActorsTypeahead,
} from '@/bsky/publicAppview';

describe('publicAppview', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetchBskyPublicProfileForDid returns handle and avatar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          handle: 'Bob.Bsky.Social',
          avatar: 'https://cdn.example/avatar.jpg',
        }),
      }),
    );
    await expect(fetchBskyPublicProfileForDid('did:plc:bob')).resolves.toEqual({
      handle: 'bob.bsky.social',
      avatarUrl: 'https://cdn.example/avatar.jpg',
    });
  });

  it('fetchBskyPublicProfileForDid ignores non-http avatar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ handle: 'x.test', avatar: 'data:image/png;base64,xx' }),
      }),
    );
    await expect(fetchBskyPublicProfileForDid('did:plc:x')).resolves.toEqual({
      handle: 'x.test',
      avatarUrl: null,
    });
  });

  it('fetchBskyHandleForDid returns lowercase handle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ handle: 'Alice.Bsky.Social' }),
      }),
    );
    await expect(fetchBskyHandleForDid('did:plc:abc')).resolves.toBe('alice.bsky.social');
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        href: 'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=did%3Aplc%3Aabc',
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('fetchBskyHandleForDid returns null on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(fetchBskyHandleForDid('did:plc:x')).resolves.toBeNull();
  });

  it('fetchBskyHandleForDid returns null when handle missing in JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );
    await expect(fetchBskyHandleForDid('did:plc:x')).resolves.toBeNull();
  });

  it('resolveAtHandleToDid strips @ and returns did', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ did: 'did:plc:zzz' }),
      }),
    );
    await expect(resolveAtHandleToDid('@user.example')).resolves.toBe('did:plc:zzz');
  });

  it('resolveAtHandleToDid returns null for empty handle', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(resolveAtHandleToDid('   ')).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('resolveAtHandleToDid returns null on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(resolveAtHandleToDid('x.y')).resolves.toBeNull();
  });

  it('resolveAtHandleToDid returns null when did invalid', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ did: 'not-did' }),
      }),
    );
    await expect(resolveAtHandleToDid('x.y')).resolves.toBeNull();
  });

  it('searchActorsTypeahead returns actors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          actors: [
            { did: 'did:plc:a', handle: 'A.Bsky.Social' },
            { did: 'bad', handle: 1 },
          ],
        }),
      }),
    );
    await expect(searchActorsTypeahead('@al', 3)).resolves.toEqual([
      { did: 'did:plc:a', handle: 'a.bsky.social' },
    ]);
  });

  it('searchActorsTypeahead returns [] for short query', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(searchActorsTypeahead('@a')).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('searchActorsTypeahead returns [] on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(searchActorsTypeahead('@alice', 5)).resolves.toEqual([]);
  });
});
