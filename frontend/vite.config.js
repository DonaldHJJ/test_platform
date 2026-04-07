import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import createGroupPlugin from './vite-plugin-create-group.js'
import path from 'path'
import config from './src/config/api.js'

export default defineConfig({
  plugins: [vue(), createGroupPlugin()],
  publicDir: 'public',
  server: {
    port: config.devServerPort,
    fs: {
      allow: ['..']
    }
  }
})
