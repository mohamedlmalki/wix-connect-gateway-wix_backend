import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { apiMiddleware } from './api-middleware.js';

const wixSiteUrl = 'https://colettesenger19254.wixsite.com/my-site-1';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'custom-api-middleware',
      configureServer(server) {
        // The middleware will now primarily handle logic, not the request itself
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
      // This rule is ONLY for Velo backend functions
      '/_functions': {
        target: wixSiteUrl,
        changeOrigin: true,
      },
      // **NEW RULE**: This forces all /api calls to be handled by the middleware
      // and ensures they are not accidentally proxied to the Wix site.
      '^/api/.*': {
        bypass(req, res, options) {
          // Let the middleware handle these requests
          return req.originalUrl;
        },
      },
    },
  },
});