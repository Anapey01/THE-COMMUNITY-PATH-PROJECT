import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // CHANGE: Force the base path to current directory (./) 
  // This bypasses path resolution conflicts in deployment environments.
  base: './', 
  plugins: [react()],
})