import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'EatAware — Know What You Eat',
        short_name: 'EatAware',
        description: "India's ingredient intelligence platform. A–F grading for 500+ packaged foods.",
        theme_color: '#1a6b3c',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['health', 'food', 'lifestyle'],
        lang: 'en-IN',
        screenshots: [],
      },
      workbox: {
        // Cache pages + assets aggressively, always revalidate API calls
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        runtimeCaching: [
          {
            // Supabase API — network first, fall back to cache
            urlPattern: /^https:\/\/tkmrqsnjcudlkiwmcula\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 }, // 24h
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Open Food Facts API — stale while revalidate
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'openfoodfacts', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
          {
            // Google Fonts — cache forever
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Code split: vendor libs separate from app code
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('react-router-dom')) return 'react-vendor'
          if (id.includes('@supabase')) return 'supabase'
        },
      },
    },
  },
})
