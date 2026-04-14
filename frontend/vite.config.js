import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import createGroupPlugin from './vite-plugin-create-group.js'
import path from 'path'

export default defineConfig({
  plugins: [vue(), createGroupPlugin()],
  publicDir: 'public',
  server: {
    host: '0.0.0.0',
    port: 5173,
    fs: {
      allow: ['..']
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:200',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
