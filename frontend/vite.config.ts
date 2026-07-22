import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

function resolveAppVersion() {
  const releaseVersion = process.env.VITE_APP_VERSION?.trim()

  if (releaseVersion) return releaseVersion

  try {
    return execFileSync('git', ['describe', '--tags', '--always', '--dirty'], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'development'
  }
}

const sharedIcons = [
  {
    src: '/pwa-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any' as const,
  },
  {
    src: '/pwa-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any' as const,
  },
  {
    src: '/maskable-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable' as const,
  },
]

export default defineConfig(() => ({
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
  },

  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: [
        'favicon1.svg',
        'icons.svg',
        'apple-touch-icon.png',
      ],
      manifest: {
        id: '/',
        name: 'FlixHDMax TV',
        short_name: 'FlixHDMax TV',
        description: 'FlixHDMax television interface for remote-controlled large screens.',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#050505',
        theme_color: '#050505',
        categories: ['entertainment', 'video'],
        icons: sharedIcons,
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/auth\//,
          /^\/uploads\//,
          /^\/admin\//,
          /^\/watch\//,
        ],
      },
    }),
  ],

  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/watch': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/admin/fetch_tmdb_data': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/admin/add_content': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/delete': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/admin/edit/series': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}))
