import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    // @ts-expect-error: @tailwindcss/vite@4.x resolves Vite internals from the
    // workspace root (rolldown-based) while the local vite package uses rollup-based
    // types, causing a structural mismatch. Runtime behaviour is correct.
    tailwindcss(),
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
