import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: { entry: 'src/index.ts', name: 'JwTheme', formats: ['iife'] },
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      external: ['react'],
      output: {
        globals: { react: 'React' },
        entryFileNames: 'js/components.iife.js',
        assetFileNames: 'css/components.css',
      },
    },
  },
});
