import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// One self-contained index.html: opens from a file, a Drive folder, or any static host.
export default defineConfig({ base: './', plugins: [react(), viteSingleFile()], build: { chunkSizeWarningLimit: 4000 } })
