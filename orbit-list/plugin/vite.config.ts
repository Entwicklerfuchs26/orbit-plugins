import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Standalone-Vorschau (testbar ohne Orbit). Dieselben Svelte-Komponenten werden
// spaeter vom Orbit-Plugin-Wrapper (orbit/index.ts) gemountet.
export default defineConfig({
  plugins: [svelte()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5177,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
    },
  },
})
