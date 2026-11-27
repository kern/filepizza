import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import useClipboard from '../../src/hooks/useClipboard'

const initialExec = Object.getOwnPropertyDescriptor(document, 'execCommand')

function installLegacyCopy(copy: (command: string) => boolean) {
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: copy,
  })
}

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  if (initialExec) Object.defineProperty(document, 'execCommand', initialExec)
  else Reflect.deleteProperty(document, 'execCommand')
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('copies with the Clipboard API and resets its indicator after the delay', async () => {
  const writeText = vi.fn(async () => {})
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  const { result } = renderHook(() => useClipboard('copy me', 80))
  await act(async () => result.current.onCopy())
  expect(writeText).toHaveBeenCalledExactlyOnceWith('copy me')
  expect(result.current.hasCopied).toBe(true)
  act(() => vi.advanceTimersByTime(80))
  expect(result.current.hasCopied).toBe(false)
})

it.each([false, true])(
  'uses legacy copy without a working Clipboard API (rejected = %s)',
  async (rejected) => {
    vi.stubGlobal('navigator', {
      clipboard: rejected
        ? {
            writeText: async () => {
              throw new Error('Denied')
            },
          }
        : undefined,
    })
    const copy = vi.fn(() => {
      expect(document.querySelector('textarea')?.value).toBe('copy me')
      return true
    })
    installLegacyCopy(copy)

    const { result } = renderHook(() => useClipboard('copy me'))
    await act(async () => result.current.onCopy())
    expect(copy).toHaveBeenCalledExactlyOnceWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
    expect(result.current.hasCopied).toBe(true)
  },
)

it('removes the temporary input and keeps the copy indicator off when legacy copy throws', () => {
  vi.stubGlobal('navigator', { clipboard: {} })
  installLegacyCopy(() => {
    throw new Error('Denied')
  })
  const { result } = renderHook(() => useClipboard('copy me'))
  act(result.current.onCopy)
  expect(document.querySelector('textarea')).toBeNull()
  expect(result.current.hasCopied).toBe(false)
})
