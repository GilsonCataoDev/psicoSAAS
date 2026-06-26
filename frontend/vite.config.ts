import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { VitePWA } from 'vite-plugin-pwa'

const BASE_PATH = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'pwa-192.svg', 'pwa-512.svg', 'pwa-192.png', 'pwa-512.png', 'pwa-512-maskable.png', 'apple-touch-icon.png', 'offline.html'],
      manifest: {
        name: 'UseCognia',
        short_name: 'UseCognia',
        description: 'Gestao inteligente para profissionais da mente',
        theme_color: '#2F7657',
        background_color: '#1D352D',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        lang: 'pt-BR',
        categories: ['health', 'productivity'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: 'pwa-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'Agenda',  short_name: 'Agenda',  url: `${BASE_PATH}agenda`,    description: 'Ver agenda do dia' },
          { name: 'Pessoas', short_name: 'Pessoas', url: `${BASE_PATH}pacientes`, description: 'Ver pessoas em acompanhamento' },
        ],
      },
      workbox: {
        // O app depende da API para operar; precacheia apenas o shell e deixa telas pesadas sob demanda.
        globPatterns: [
          // index.html deve sempre vir da rede para não apontar para chunks removidos após deploy.
          '**/*.{css,svg,png,ico,woff2}',
          'assets/index-*.js',
          'assets/react-vendor-*.js',
          'assets/query-vendor-*.js',
          'assets/form-vendor-*.js',
          'assets/rolldown-runtime-*.js',
        ],
        globIgnores: [
          'assets/illustrations/**',
          'assets/empty-states/**',
          'assets/icons/**',
          'og-image.png',
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: null,
        importScripts: [`${BASE_PATH}push-sw.js`],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  css: {
    postcss: { plugins: [tailwindcss, autoprefixer] },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'query-vendor'
          }
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform')) {
            return 'form-vendor'
          }
          if (id.includes('node_modules/date-fns')) {
            return 'date-vendor'
          }
          if (id.includes('node_modules/posthog-js')) return 'analytics-vendor'
          if (id.includes('node_modules/pdfkit') || id.includes('node_modules/qrcode')) {
            return 'pdf-vendor'
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } },
  },
})
