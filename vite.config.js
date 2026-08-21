import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from /<repo>/, so production needs that
// base. Dev stays on / — setting it unconditionally would move the dev server
// under the repo path too, for no benefit.
//
// Keyed on mode, not command: `vite preview` runs as command 'serve', so keying
// on command leaves preview serving a build whose asset URLs all point at the
// base path it is not using, and every request 404s.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/expert-commentary/' : '/',
}))
