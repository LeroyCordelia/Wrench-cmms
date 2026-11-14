import { copyFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub project pages are served from /Wrench-cmms/. Dev stays at / so phone
// routes like /a/AST-0001 work on a local preview without the prefix.
export default defineConfig(({ command, isPreview }) => {
  // Dev stays at /. The built site and `vite preview` use the GitHub Pages prefix.
  const base = command === 'build' || isPreview ? '/Wrench-cmms/' : '/'
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'CMMS_Data_Template.xlsx'],
        manifest: {
          name: 'Wrench CMMS',
          short_name: 'Wrench',
          description: 'Maintenance for the winery and bottling plant',
          theme_color: '#14804a',
          background_color: '#f3f5f8',
          display: 'standalone',
          start_url: '.',
          scope: '.',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          navigateFallback: 'index.html',
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,xlsx,webmanifest}'],
        },
        devOptions: { enabled: false },
      }),
      {
        name: 'github-pages-spa-fallback',
        apply: 'build',
        closeBundle() {
          copyFileSync('dist/index.html', 'dist/404.html')
        },
      },
    ],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  }
})
