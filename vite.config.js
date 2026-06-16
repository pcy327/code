import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Milkdown + ProseMirror editor
          editor: [
            '@milkdown/kit',
            '@milkdown/react',
            '@milkdown/theme-nord',
            '@milkdown/plugin-slash',
            '@milkdown/plugin-tooltip',
            '@milkdown/utils',
            'prosemirror-state',
            'prosemirror-view',
            'prosemirror-model',
          ],
          // Markdown rendering + syntax highlighting
          markdown: [
            'react-markdown',
            'remark-gfm',
            'react-syntax-highlighter',
          ],
          // React + router
          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          // Icons
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
