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
      includeAssets: ['icons.svg'],
      workbox: {
        navigateFallback: '/index.html',
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
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
