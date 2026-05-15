import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/run':     'http://localhost:8000',
      '/history': 'http://localhost:8000',
      '/improve': 'http://localhost:8000',
      '/prompts': 'http://localhost:8000',
    },
  },
})
