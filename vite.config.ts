import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons.svg', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png'],
      workbox: {
        navigateFallback: '/index.html',
        // The PDF-export libraries (html2canvas/jspdf) are dynamically imported
        // only when a user actually clicks "Download PDF" — excluding them from
        // the precache keeps that ~250KB out of every install's upfront download.
        globIgnores: ['**/html2canvas-*.js', '**/jspdf*.js', '**/purify.es-*.js', '**/index.es-*.js'],
      },
      manifest: {
        name: 'SLF Members Hub',
        short_name: 'Members Hub',
        description: 'Admin-only member management for SLF Ministries',
        theme_color: '#26314A',
        background_color: '#F2EEE4',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Android otherwise auto-generates its own adaptive-icon mask by
          // shrinking the full-bleed icon above into a smaller safe zone and
          // rescaling — that extra resampling is what was causing the blur.
          // This one already has the safe-zone padding baked in, so Android
          // uses it directly instead of computing its own.
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
