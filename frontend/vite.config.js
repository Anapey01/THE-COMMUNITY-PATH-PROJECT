import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = 'THE-COMMUNITY-PATH-PROJECT'; 

// https://vitejs.dev/config/
export default defineConfig({
  base: `/${repoName}/`,
  plugins: [react()],
  
  // --- ADD THIS BLOCK TO RESOLVE AXIOS BUILD ERROR ---
  build: {
    rollupOptions: {
      // Explicitly tells Rollup NOT to try to bundle axios
      // This stops the 'failed to resolve module' error.
      external: ['axios'], 
    },
  },
  // ----------------------------------------------------
})