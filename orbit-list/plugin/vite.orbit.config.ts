import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

// Baut EIN Orbit-Plugin als eigenstaendiges ESM-Bundle (wie skwd-wall-sync/vite.plugin.config.ts):
//   PLUGIN=anime-liste npx vite build --config vite.orbit.config.ts   → dist-orbit/anime-liste/main.js
// Nur `@core` bleibt extern (wird zur Laufzeit an globalThis.Orbit des Hosts gebunden).
const id = process.env.PLUGIN
if (!id) throw new Error('PLUGIN env var required, z. B. PLUGIN=anime-liste')
const VIRTUAL_CORE = '\0orbit-core-runtime'

export default defineConfig({
  plugins: [
    {
      name: 'orbit-core-external',
      enforce: 'pre',
      resolveId(src) { return src === '@core' ? VIRTUAL_CORE : null },
      load(src) {
        if (src !== VIRTUAL_CORE) return null
        return ['const O = globalThis.Orbit;', 'export const Plugin = O.Plugin;', 'export const View = O.View;'].join('\n')
      },
    },
    svelte({ emitCss: false }),
  ],
  build: {
    outDir: `dist-orbit/${id}`,
    emptyOutDir: true,
    target: 'esnext',
    minify: false,
    lib: { entry: resolve(__dirname, `orbit/${id}.ts`), formats: ['es'], fileName: () => 'main.js' },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
