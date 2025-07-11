import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/generate-plan': 'http://localhost:5000',
      '/check-in': 'http://localhost:5000',
      '/query': 'http://localhost:5000',
      '/longevity-tip': 'http://localhost:5000',
      '/generate-line': 'http://localhost:5000',
      '/facts':       'http://localhost:5000',
      '/pending':     'http://localhost:5000',
      '/stream':      { target: 'http://localhost:5000', ws: true },
      '/prepare-thread':   'http://localhost:5000',
      '/extract-fact':     'http://localhost:5000',

    }
  }
});