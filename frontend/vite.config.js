import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import createGroupPlugin from './vite-plugin-create-group.js'

export default defineConfig({
  plugins: [vue(), createGroupPlugin()],
})
