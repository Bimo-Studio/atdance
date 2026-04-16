/**
 * Dev server: map `/admin` and `/admin/` to the admin HTML entry (same as `vercel.json` rewrites).
 */
export function viteAdminIndexRewrite(rawUrl: string): string {
  const raw = rawUrl ?? '';
  const q = raw.indexOf('?');
  const pathname = q === -1 ? raw : raw.slice(0, q);
  const search = q === -1 ? '' : raw.slice(q);
  if (pathname === '/admin' || pathname === '/admin/') {
    return `/admin/index.html${search}`;
  }
  return raw;
}
