// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/ecb': {
        target: 'https://data-api.ecb.europa.eu',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api\/ecb/, ''),
      },
      '/api/eurostat': {
        target: 'https://ec.europa.eu',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api\/eurostat/, '/eurostat/api/dissemination/statistics/1.0/data'),
      },
      '/api/fred': {
        target: 'https://api.stlouisfed.org',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/api\/fred/, '/fred'),
      },
      '/api/fmp': {
        target: 'https://financialmodelingprep.com/stable',
        changeOrigin: true,
        secure: true,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        rewrite: p => p.replace(/^\/api\/fmp/, '/api'),
      },
    },
  },
});
