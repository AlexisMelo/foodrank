import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use '@/styles/responsive.scss' as responsive;`,
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7207',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
