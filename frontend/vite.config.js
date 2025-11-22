import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// You must define your repository name here
const repoName = 'THE-COMMUNITY-PATH-PROJECT'; 

// https://vitejs.dev/config/
export default defineConfig({
  base: `/${repoName}/`, 
  plugins: [react()],
})
