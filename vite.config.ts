import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '127.0.0.1',
    port: Number(process.env.GOMOKU_WEB_PORT || 5187),
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${process.env.GOMOKU_API_PORT || 18087}` },
  },
});
