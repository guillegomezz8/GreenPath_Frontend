import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs/promises'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const stripLucideSourceMaps = {
  name: 'strip-lucide-source-maps',
  setup(build) {
    build.onLoad({ filter: /node_modules[\\/]lucide-react[\\/]dist[\\/]esm[\\/].*\.js$/ }, async (args) => {
      const source = await fs.readFile(args.path, 'utf8')
      return {
        contents: source.replace(/\n?\/\/# sourceMappingURL=.*\.map\s*$/gm, ''),
        loader: 'js',
      }
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [stripLucideSourceMaps],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
  },
  server: {
    host: '0.0.0.0',
    watch: {
      usePolling: true,
    },
    hmr: {
      clientPort: 5173,
    },
  },
})
