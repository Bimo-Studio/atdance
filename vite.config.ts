import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import { defineConfig, type Plugin } from 'vite';

import { oauthClientMetadataObject } from './src/auth/oauthClientMetadata';
import { resolveBuildGitSha } from './src/build/resolveBuildGitSha';
import { viteAdminIndexRewrite } from './src/build/viteAdminIndexRewrite';
import { syncAcknowledgementsAssets } from './scripts/syncAcknowledgementsAssets';

const timidityFreepatsCfg = readFileSync(
  fileURLToPath(new URL('./node_modules/timidity/freepats.cfg', import.meta.url)),
  'utf8',
);

function tryGitRevShort(): string | undefined {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
}

const buildGitSha = resolveBuildGitSha(process.env, tryGitRevShort());

/** Public site origin for OAuth `client_id` JSON (Vercel / Cloudflare Pages / manual). */
function deploymentSiteUrl(): string | undefined {
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel}`;
  }
  const cf = process.env.CF_PAGES_URL?.trim();
  if (cf) {
    return cf.startsWith('http') ? cf.replace(/\/$/, '') : `https://${cf}`;
  }
  const manual = process.env.VITE_PUBLIC_APP_ORIGIN?.trim();
  if (manual) {
    return manual.replace(/\/$/, '');
  }
  return undefined;
}

/**
 * Dev-only: match production `vercel.json` rewrites so `/admin` serves `admin/index.html`.
 * Without this, Vite's SPA fallback serves the root `index.html` (main Phaser app) for `/admin`.
 */
function adminRouteDevPlugin(): Plugin {
  return {
    name: 'atdance-admin-route-dev',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url !== undefined) {
          const nextUrl = viteAdminIndexRewrite(req.url);
          if (nextUrl !== req.url) {
            req.url = nextUrl;
          }
        }
        next();
      });
    },
  };
}

function acknowledgementsAssetsPlugin(): Plugin {
  return {
    name: 'atdance-sync-acknowledgements-assets',
    buildStart() {
      syncAcknowledgementsAssets();
    },
  };
}

/** timidity expects brfs to inline `freepats.cfg`; Vite inlines it here instead. */
function timidityInlineFreepatsPlugin(): Plugin {
  const inlined = `const TIMIDITY_CFG = ${JSON.stringify(timidityFreepatsCfg)}`;
  return {
    name: 'atdance-timidity-inline-freepats',
    enforce: 'pre',
    transform(code, id) {
      const norm = id.replace(/\\/g, '/');
      if (!norm.includes('/node_modules/timidity/') || !norm.endsWith('/index.js')) {
        return null;
      }
      if (!code.includes('TIMIDITY_CFG')) {
        return null;
      }
      let next = code.replace("const fs = require('fs')\n", '');
      next = next.replace(
        `// Inlined at build time by 'brfs' browserify transform
const TIMIDITY_CFG = fs.readFileSync(
  __dirname + '/freepats.cfg', // eslint-disable-line node/no-path-concat
  'utf8'
)`,
        inlined,
      );
      if (next.includes('fs.readFileSync')) {
        throw new Error('atdance-timidity-inline-freepats: failed to inline timidity freepats.cfg');
      }
      return next;
    },
  };
}

function oauthClientMetadataPlugin(): Plugin {
  return {
    name: 'atdance-oauth-client-metadata',
    apply: 'build',
    generateBundle() {
      const origin = deploymentSiteUrl();
      if (!origin) {
        return;
      }
      const metadata = oauthClientMetadataObject(origin);
      this.emitFile({
        type: 'asset',
        fileName: 'oauth-client-metadata.json',
        source: JSON.stringify(metadata),
      });
    },
  };
}

/** Browser bundle (avoids Node `events`/`path`/etc. in Vite/Rollup). */
const webtorrentBrowser = fileURLToPath(
  new URL('./node_modules/webtorrent/dist/webtorrent.min.js', import.meta.url),
);

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', import.meta.url)),
        admin: fileURLToPath(new URL('admin/index.html', import.meta.url)),
      },
    },
  },
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
    acknowledgementsAssetsPlugin(),
    timidityInlineFreepatsPlugin(),
    adminRouteDevPlugin(),
    oauthClientMetadataPlugin(),
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
    include: ['buffer', 'hyperswarm-web', 'debug', 'events'],
    // `timidity` must NOT be pre-bundled: esbuild skips our `timidityInlineFreepatsPlugin`
    // (deps land in `.vite/deps/timidity.js`, not `timidity/index.js`), so `freepats.cfg`
    // would never be inlined and `fs.readFileSync` breaks in the browser.
    exclude: ['webtorrent', 'timidity'],
  },
  server: {
    /** IPv4 loopback so `curl http://127.0.0.1:<port>` and ATProto OAuth callbacks match `redirect_uri`. */
    host: true,
    port: 5174,
    strictPort: true,
  },
});
