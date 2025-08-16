import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath, URL } from 'node:url';
import { apiMiddleware } from './api-middleware.js';

const wixSiteUrl = 'https://colettesenger19254.wixsite.com/my-site-1';

export default defineConfig({
  // This is the critical line that fixes the issue.
  base: './',

  plugins: [
    react(),
    {
      name: 'custom-api-middleware',
      configureServer(server) {
        server.middlewares.use(apiMiddleware);
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/_functions': {
        target: wixSiteUrl,
        changeOrigin: true,
      },
      '^/api/.*': {
        bypass(req, res, options) {
          return req.originalUrl;
        },
      },
    },
  },
});