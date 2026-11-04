import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // HOMEDATA_API_KEY has no VITE_ prefix on purpose: it stays on the dev server
  // and is never bundled into the browser code.
  const env = loadEnv(mode, '.', '');
  const homedataKey = env.HOMEDATA_API_KEY;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: homedataKey
        ? {
            '/api/homedata': {
              target: 'https://api.homedata.co.uk',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/homedata/, ''),
              headers: { Authorization: `Api-Key ${homedataKey}` },
            },
          }
        : undefined,
    },
  };
});
