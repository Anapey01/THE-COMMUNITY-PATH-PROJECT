import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // DELETE OR COMMENT OUT THIS LINE FOR VERCEL:
  // base: './', 
  plugins: [react()],
})