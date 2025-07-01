/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import UnlockButton from '../../src/components/UnlockButton'

describe('UnlockButton', () => {
  it('calls onClick', () => {
    const fn = vi.fn()
    const { getByText } = render(<UnlockButton onClick={fn} />)
    fireEvent.click(getByText('Unlock'))
    expect(fn).toHaveBeenCalled()
  })
})
