import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { apiMiddleware } from './api-middleware.js';

const wixSiteUrl = 'https://colettesenger19254.wixsite.com/my-site-1';

export default defineConfig({
  // **FIX**: Add this line back in. This is the key.
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
      '@': path.resolve(__dirname, './src'),
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