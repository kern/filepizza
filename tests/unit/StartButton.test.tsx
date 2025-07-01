/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StartButton from '../../src/components/StartButton'

describe('StartButton', () => {
  it('calls handler', () => {
    const fn = vi.fn()
    const { getByText } = render(<StartButton onClick={fn} />)
    fireEvent.click(getByText('Start'))
    expect(fn).toHaveBeenCalled()
  })
})
