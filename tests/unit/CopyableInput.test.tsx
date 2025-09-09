/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { act } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { CopyableInput } from '../../src/components/CopyableInput'

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
})

describe('CopyableInput', () => {
  it('copies text when button clicked', async () => {
    const { getByText } = render(<CopyableInput label="URL" value="hello" />)
    await act(async () => {
      fireEvent.click(getByText('Copy'))
    })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello')
  })
})
