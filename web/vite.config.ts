import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, host: true, allowedHosts: true },
  test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.ts'] },
});
