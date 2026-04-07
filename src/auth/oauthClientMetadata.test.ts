import { describe, expect, it } from 'vitest';

import { oauthClientMetadataObject } from '@/auth/oauthClientMetadata';

describe('oauthClientMetadataObject', () => {
  it('uses stable client_id and redirect_uris for origin', () => {
    const o = oauthClientMetadataObject('https://preview.example.vercel.app');
    expect(o.client_id).toBe('https://preview.example.vercel.app/oauth-client-metadata.json');
    expect(o.redirect_uris).toEqual(['https://preview.example.vercel.app/']);
  });

  it('strips trailing slash from origin', () => {
    const o = oauthClientMetadataObject('https://app.example.com/');
    expect(o.client_uri).toBe('https://app.example.com');
  });
});
