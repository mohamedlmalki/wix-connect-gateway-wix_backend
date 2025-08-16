import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
// **FIX**: Use modern URL-based path resolution
import { fileURLToPath, URL } from 'node:url';
import { apiMiddleware } from './api-middleware.js';

const wixSiteUrl = 'https://colettesenger19254.wixsite.com/my-site-1';

export default defineConfig({
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
      // **FIX**: Define the alias using the new, more reliable method
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