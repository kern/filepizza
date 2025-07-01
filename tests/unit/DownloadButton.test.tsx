/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DownloadButton from '../../src/components/DownloadButton'

describe('DownloadButton', () => {
  it('calls onClick', () => {
    const fn = vi.fn()
    const { getByText } = render(<DownloadButton onClick={fn} />)
    fireEvent.click(getByText('Download'))
    expect(fn).toHaveBeenCalled()
  })
})
