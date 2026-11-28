import { act, render, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ThemeProvider,
  themeScript,
  useTheme,
} from '../../src/components/ThemeProvider'

function mockSystemDark(matches: boolean) {
  const listeners = new Set<(event: { matches: boolean }) => void>()
  vi.stubGlobal('matchMedia', () => ({
    matches,
    addEventListener: (_: string, fn: (event: { matches: boolean }) => void) =>
      listeners.add(fn),
    removeEventListener: (
      _: string,
      fn: (event: { matches: boolean }) => void,
    ) => listeners.delete(fn),
  }))
  return (next: boolean) => listeners.forEach((fn) => fn({ matches: next }))
}

const wrapper =
  (defaultTheme?: 'light' | 'dark' | 'system') =>
  ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider defaultTheme={defaultTheme}>{children}</ThemeProvider>
  )

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
})

describe('ThemeProvider', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>,
    )
    expect(getByText('child')).toBeInTheDocument()
  })

  it('follows the system theme and reacts to it changing', () => {
    const changeSystem = mockSystemDark(true)
    const { result } = renderHook(() => useTheme(), { wrapper: wrapper() })
    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')

    act(() => changeSystem(false))
    expect(result.current.resolvedTheme).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('persists an explicit choice and restores it', () => {
    mockSystemDark(false)
    const first = renderHook(() => useTheme(), { wrapper: wrapper() })
    act(() => first.result.current.setTheme('dark'))
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
    first.unmount()

    const second = renderHook(() => useTheme(), { wrapper: wrapper() })
    expect(second.result.current.theme).toBe('dark')
  })

  it('falls back to the default for unknown or unreadable storage', () => {
    mockSystemDark(false)
    localStorage.setItem('theme', 'purple')
    const unknown = renderHook(() => useTheme(), { wrapper: wrapper('light') })
    expect(unknown.result.current.theme).toBe('light')
    unknown.unmount()

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const blocked = renderHook(() => useTheme(), { wrapper: wrapper('dark') })
    expect(blocked.result.current.theme).toBe('dark')
    act(() => blocked.result.current.setTheme('light'))
    expect(blocked.result.current.theme).toBe('light')
    vi.restoreAllMocks()
  })

  it('has inert defaults outside a provider', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('light')
    expect(() => result.current.setTheme('dark')).not.toThrow()
  })
})

describe('themeScript', () => {
  const run = () => new Function(themeScript)()

  it('applies the stored or system theme before first paint', () => {
    mockSystemDark(false)
    localStorage.setItem('theme', 'dark')
    run()
    expect(document.documentElement).toHaveClass('dark')

    localStorage.setItem('theme', 'light')
    run()
    expect(document.documentElement).not.toHaveClass('dark')

    localStorage.removeItem('theme')
    mockSystemDark(true)
    run()
    expect(document.documentElement).toHaveClass('dark')
  })

  it('never throws when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(run).not.toThrow()
    vi.restoreAllMocks()
  })
})
