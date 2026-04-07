/**
 * Resolve a short git revision for build-time injection (Vite) and UI.
 * CI: Vercel / Cloudflare Pages / GitHub Actions set full SHAs; local dev uses `git rev-parse`.
 */
export function resolveBuildGitSha(
  env: Record<string, string | undefined>,
  shortRevFromGit?: string,
): string {
  const full = (
    env.VERCEL_GIT_COMMIT_SHA ??
    env.CF_PAGES_COMMIT_SHA ??
    env.GITHUB_SHA ??
    env.COMMIT_REF ??
    ''
  ).trim();
  if (full.length >= 7) {
    return full.slice(0, 7);
  }
  const g = shortRevFromGit?.trim() ?? '';
  if (/^[0-9a-f]{4,40}$/i.test(g)) {
    return g.slice(0, 7);
  }
  return 'unknown';
}
