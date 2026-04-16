import { describe, expect, it } from 'vitest';

import {
  atdanceLoopbackRedirectUris,
  atprotoSignInRedirectOptions,
  currentAtdanceOAuthRedirectUri,
} from '@/auth/loopbackOAuthRedirectUris';

describe('atdanceLoopbackRedirectUris', () => {
  it('maps localhost to 127.0.0.1 and includes root and admin paths', () => {
    expect(atdanceLoopbackRedirectUris('http://localhost:5174')).toEqual([
      'http://127.0.0.1:5174/',
      'http://127.0.0.1:5174/admin',
      'http://127.0.0.1:5174/admin/',
    ]);
  });

  it('preserves 127.0.0.1', () => {
    expect(atdanceLoopbackRedirectUris('http://127.0.0.1:5174')).toEqual([
      'http://127.0.0.1:5174/',
      'http://127.0.0.1:5174/admin',
      'http://127.0.0.1:5174/admin/',
    ]);
  });
});

describe('currentAtdanceOAuthRedirectUri', () => {
  it('maps localhost to 127.0.0.1 for /admin so it matches loopback registration', () => {
    expect(
      currentAtdanceOAuthRedirectUri({
        origin: 'http://localhost:5174',
        pathname: '/admin',
      }),
    ).toBe('http://127.0.0.1:5174/admin');
  });

  it('returns trailing slash URI for root path', () => {
    expect(
      currentAtdanceOAuthRedirectUri({
        origin: 'http://127.0.0.1:5174',
        pathname: '/',
      }),
    ).toBe('http://127.0.0.1:5174/');
  });

  it('supports https origins without localhost rewrite', () => {
    expect(
      currentAtdanceOAuthRedirectUri({
        origin: 'https://preview.example.vercel.app',
        pathname: '/admin',
      }),
    ).toBe('https://preview.example.vercel.app/admin');
  });

  it('returns undefined for unregistered paths', () => {
    expect(
      currentAtdanceOAuthRedirectUri({
        origin: 'https://app.example.com',
        pathname: '/sync-lab',
      }),
    ).toBeUndefined();
  });
});

describe('atprotoSignInRedirectOptions', () => {
  it('returns redirect_uri object when pathname is registered', () => {
    expect(
      atprotoSignInRedirectOptions({
        origin: 'http://127.0.0.1:5174',
        pathname: '/admin/',
      } as Location),
    ).toEqual({ redirect_uri: 'http://127.0.0.1:5174/admin/' });
  });

  it('returns undefined when pathname is not registered', () => {
    expect(
      atprotoSignInRedirectOptions({
        origin: 'https://app.example.com',
        pathname: '/foo',
      } as Location),
    ).toBeUndefined();
  });
});
