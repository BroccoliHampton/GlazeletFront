import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Replace 'glaze-world' with your actual GitHub repo name
  base: '/glaze-world/',
})
