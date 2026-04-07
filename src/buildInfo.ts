/** Value injected in `vite.config.ts` via `define` — see `resolveBuildGitSha`. */
export const BUILD_GIT_SHA: string = __APP_GIT_SHA__;

export function buildInfoLines(): string[] {
  const mode = import.meta.env.MODE;
  return [`Git: ${BUILD_GIT_SHA}`, `Mode: ${mode}`, `Dev: ${import.meta.env.DEV ? 'yes' : 'no'}`];
}
