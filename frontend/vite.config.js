import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    coverage: {
      provider: 'v8',
      // lcov for SonarQube, text/html for humans.
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/tests/**', 'src/**/*.test.{js,jsx}', 'src/setupTests.js', 'src/main.jsx'],
    },
  },
  server: {
    proxy: {
      '/api': process.env.VITE_BACKEND_URL || 'http://localhost:8080',
    },
  },
})
