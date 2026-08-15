import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/react-effect-atom/',
  plugins: [react(), tailwindcss()],
  resolve: { tsconfigPaths: true },
})
