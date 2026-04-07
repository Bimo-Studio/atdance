/**
 * ATProto OAuth client metadata (hosted at `client_id` URL) for non-loopback hosts.
 * @see https://github.com/bluesky-social/atproto/blob/main/packages/oauth/oauth-client-browser/README.md
 */
export function oauthClientMetadataObject(origin: string): Record<string, unknown> {
  const base = origin.replace(/\/$/, '');
  const clientId = `${base}/oauth-client-metadata.json`;
  return {
    client_id: clientId,
    client_name: 'ATDance',
    client_uri: base,
    redirect_uris: [`${base}/`],
    scope: 'atproto',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    dpop_bound_access_tokens: true,
  };
}
