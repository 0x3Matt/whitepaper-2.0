import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'

// Plugin to copy docs folder
function copyDocsPlugin() {
  return {
    name: 'copy-docs',
    writeBundle() {
      const copyDir = (src, dest) => {
        mkdirSync(dest, { recursive: true })
        const entries = readdirSync(src, { withFileTypes: true })
        
        for (const entry of entries) {
          const srcPath = join(src, entry.name)
          const destPath = join(dest, entry.name)
          
          if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
          } else {
            copyFileSync(srcPath, destPath)
          }
        }
      }
      
      copyDir('docs', 'dist/docs')
    }
  }
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true
  },
  css: {
    devSourcemap: true
  },
  plugins: [copyDocsPlugin()]
})