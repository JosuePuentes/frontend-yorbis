import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['xlsx'],
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      include: [/xlsx/, /node_modules/],
    },
    rollupOptions: {
      output: {
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      onwarn(warning, warn) {
        // Suprimir warnings de API deprecada de Performance y otros warnings comunes
        if (
          warning.code === 'DEPRECATED_FEATURE' || 
          warning.message?.includes('Deprecated API') ||
          warning.message?.includes('entry type') ||
          warning.code === 'PLUGIN_WARNING' ||
          warning.code === 'UNRESOLVED_IMPORT'
        ) {
          return;
        }
        warn(warning);
      }
    }
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'xlsx'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  logLevel: 'warn' // Reducir logs innecesarios
})
