import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        abrechnung: '2-Abrechnung.html',
        stundenzettel: '3-Stundenzettel.html'
      }
    }
  }
})
