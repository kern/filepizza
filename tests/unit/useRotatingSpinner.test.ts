import { describe, it, expect, vi } from 'vitest'
import {
  setRotating,
  addRotationListener,
  removeRotationListener,
  getRotating,
} from '../../src/hooks/useRotatingSpinner'

describe('useRotatingSpinner state helpers', () => {
  it('notifies listeners on state change', () => {
    const listener = vi.fn()
    addRotationListener(listener)
    setRotating(true)
    expect(listener).toHaveBeenCalledWith(true)
    expect(getRotating()).toBe(true)
    setRotating(false)
    expect(listener).toHaveBeenCalledWith(false)
    expect(getRotating()).toBe(false)
    removeRotationListener(listener)
  })
})
