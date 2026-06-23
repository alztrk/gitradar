import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/gitradar/',
  build: { outDir: 'docs' },
  plugins: [react(), tailwindcss()],
})
