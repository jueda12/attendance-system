import path from 'node:path'
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    // Tailwind plugin type can resolve from the workspace root in npm workspaces,
    // which may not match the local Vite type identity during TS build.
    // Verified with @tailwindcss/vite@4.2.4 and vite@7.3.2.
    tailwindcss() as unknown as PluginOption,
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
