import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import createGroupPlugin from './vite-plugin-create-group.js'
import path from 'path'
import config from './src/config/api.js'

export default defineConfig({
  plugins: [vue(), createGroupPlugin()],
  publicDir: 'public',
  server: {
    host: '0.0.0.0',
    port: config.devServerPort,
    fs: {
      allow: ['..']
    },
    proxy: {
      '/api': {
        target: config.apiBaseUrl,
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})
