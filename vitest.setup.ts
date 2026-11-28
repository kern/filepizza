import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

if (typeof window !== 'undefined' && !window.matchMedia) {
  vi.stubGlobal('matchMedia', (media: string): MediaQueryList => ({
    matches: false,
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  }))
}
