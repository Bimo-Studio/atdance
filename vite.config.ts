import { execSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

import { resolveBuildGitSha } from './src/build/resolveBuildGitSha';

function tryGitRevShort(): string | undefined {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
}

const buildGitSha = resolveBuildGitSha(process.env, tryGitRevShort());

/** Browser bundle (avoids Node `events`/`path`/etc. in Vite/Rollup). */
const webtorrentBrowser = fileURLToPath(
  new URL('./node_modules/webtorrent/dist/webtorrent.min.js', import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      webtorrent: webtorrentBrowser,
      buffer: 'buffer',
    },
  },
  define: {
    global: 'globalThis',
    __APP_GIT_SHA__: JSON.stringify(buildGitSha),
  },
  plugins: [
    {
      name: 'atdance-index-git-flowerbox',
      transformIndexHtml(html) {
        const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
        const flower = `<!--
  atdance · git ${buildGitSha} · ${mode}
  (same SHA as in-game Build info — I key from title / song select)
-->
`;
        return html.replace('<!doctype html>', `<!doctype html>\n${flower}`);
      },
    },
  ],
  optimizeDeps: {
    // `webtorrent` is aliased to the prebuilt `min.js` — do not list
    // `webtorrent/dist/...` here (Vite 6 + Node 24 can double-resolve to ENOTDIR).
    include: ['buffer', 'hyperswarm-web'],
    exclude: ['webtorrent'],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
