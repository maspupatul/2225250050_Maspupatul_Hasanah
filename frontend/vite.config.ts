import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// The API runs on :8000 (FastAPI). In development Vite proxies /api to it.
const API_TARGET = 'http://localhost:8000';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Z-Math — Belajar Bilangan Bulat',
        short_name: 'Z-Math',
        description:
          'Belajar bilangan bulat SMP: termometer, garis bilangan, soal cerita, petunjuk bertahap, dan Ujian Akhir.',
        lang: 'id',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#3B2D4F',
        theme_color: '#3B2D4F',
        categories: ['education'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/docs/, /^\/openapi\.json/],
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/(modules|lessons|glossary|exam$)/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'bulatku-content' },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5173, host: true, proxy: { '/api': API_TARGET } },
  preview: { port: 4173, host: true, proxy: { '/api': API_TARGET } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  build: { chunkSizeWarningLimit: 600 },
});
