import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Pubblicato come sottocartella del sito di QuickCheck (xtomeku.github.io/quickcheck/sondaggio/):
// tutti i percorsi sono relativi, così funziona in qualsiasi cartella.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
