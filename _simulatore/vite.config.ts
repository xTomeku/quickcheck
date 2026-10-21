/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Pubblicato come sottocartella del sito di QuickCheck (xtomeku.github.io/quickcheck/simulatore/):
// tutti i percorsi sono relativi, così funziona in qualsiasi cartella.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icona.svg'],
      manifest: {
        name: 'Simulatore semestre filtro · QuickCheck',
        short_name: 'Simulatore',
        description: 'Prove di biologia, chimica e fisica nel formato ufficiale del semestre filtro',
        lang: 'it',
        start_url: './',
        scope: './',
        theme_color: '#c6242d',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [{ src: 'icona.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          // domande: sempre la versione più recente se c'è rete, quella in cache se si è offline
          { urlPattern: /\/domande\/.*\.json$/, handler: 'NetworkFirst', options: { cacheName: 'domande', networkTimeoutSeconds: 4 } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, handler: 'StaleWhileRevalidate', options: { cacheName: 'font' } },
        ],
      },
    }),
  ],
  build: { outDir: 'dist', emptyOutDir: true },
  test: { environment: 'node' },
})
