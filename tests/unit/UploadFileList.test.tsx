/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import UploadFileList from '../../src/components/UploadFileList'

describe('UploadFileList', () => {
  it('calls onRemove', () => {
    const fn = vi.fn()
    const files = [{ fileName: 'a.txt', type: 'text/plain' }]
    const { getByText } = render(<UploadFileList files={files} onRemove={fn} />)
    fireEvent.click(getByText('✕'))
    expect(fn).toHaveBeenCalledWith(0)
  })
})
