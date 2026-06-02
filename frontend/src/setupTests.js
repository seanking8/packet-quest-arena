import '@testing-library/jest-dom'
import { vi } from 'vitest'

Object.defineProperty(globalThis.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn(() => Promise.resolve()),
})

Object.defineProperty(globalThis.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(globalThis.HTMLMediaElement.prototype, 'load', {
  configurable: true,
  value: vi.fn(),
})
