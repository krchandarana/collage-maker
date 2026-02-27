import { defineConfig } from 'vite';

export default defineConfig({
  base: '/collage-maker/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
});
