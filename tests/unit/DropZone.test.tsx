/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DropZone from '../../src/components/DropZone'

function createFile(name: string) {
  return new File(['hello'], name, { type: 'text/plain' })
}

describe('DropZone', () => {
  it('calls onDrop when file selected', () => {
    const fn = vi.fn()
    const { container } = render(<DropZone onDrop={fn} />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [createFile('a.txt')] } })
    expect(fn).toHaveBeenCalled()
  })
})
