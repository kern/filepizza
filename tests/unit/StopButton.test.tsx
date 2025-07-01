/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StopButton from '../../src/components/StopButton'

describe('StopButton', () => {
  it('labels correctly when downloading', () => {
    const { getByText } = render(<StopButton onClick={() => {}} isDownloading />)
    expect(getByText('Stop Download')).toBeInTheDocument()
  })

  it('calls handler', () => {
    const fn = vi.fn()
    const { getByText } = render(<StopButton onClick={fn} />)
    fireEvent.click(getByText('Stop Upload'))
    expect(fn).toHaveBeenCalled()
  })
})
