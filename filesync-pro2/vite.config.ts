import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom", "three"],
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
        'react': path.resolve(import.meta.dirname, 'node_modules/react'),
        'react-dom': path.resolve(import.meta.dirname, 'node_modules/react-dom'),
      },
    },
    server: {
      allowedHosts: true as const,
      hmr: false,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
