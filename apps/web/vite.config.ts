import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load .env, .env.[mode], etc. Vite only exposes VITE_* to the client,
  // but the config can read any env var.
  const env = loadEnv(mode, process.cwd(), '');

  // If you don't set a port, Vite will choose its default (typically 5173) or the next free one.
  const portRaw = env.VITE_WEB_PORT ?? env.PORT;
  const port = portRaw ? Number(portRaw) : undefined;

  // Optional dev proxy target (example: http://localhost:3001). If unset, no proxy is configured.
  const apiProxyTarget = env.VITE_API_PROXY_TARGET?.trim();

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'EduCycle',
          short_name: 'EduCycle',
          description: 'Academic Resource Exchange Platform',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@recycle/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts')
      }
    },
    server: {
      ...(port ? { port } : {}),
      host: true,
      ...(apiProxyTarget
        ? {
            proxy: {
              '/api': {
                target: apiProxyTarget,
                changeOrigin: true
              }
            }
          }
        : {})
    },
    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'query-vendor': ['@tanstack/react-query'],
            'ui-vendor': ['lucide-react']
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom']
    }
  };
});
