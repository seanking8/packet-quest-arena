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
      reporter: ['text', 'lcov'],
      // Measure all source files (not just imported ones)...
      all: true,
      include: ['src/**/*.{js,jsx}'],
      // ...but exclude code that can't be meaningfully unit-tested in jsdom:
      // the 3D WebGL scenes (no WebGL in jsdom) and the app entry points.
      // These are verified by build + manual/visual checks, not unit tests.
      exclude: [
        'src/main.jsx',
        'src/setupTests.js',
        'src/components/map/NetworkScene.jsx',
        'src/components/map/DistrictScene.jsx',
        'src/components/map/TutorialDistrictScene.jsx',
        'src/components/map/PlanetScene.jsx',
        'src/components/map/cityDetails.jsx',
        'src/components/map/IncidentZones.jsx',
      ],
    },
  },
  server: {
    proxy: {
      '/api': process.env.VITE_BACKEND_URL || 'http://localhost:8080',
      '/ws': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8080',
        ws: true,
      },
    },
  },
})
