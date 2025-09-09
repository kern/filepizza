/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CancelButton from '../../src/components/CancelButton'

describe('CancelButton', () => {
  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    const { getByText } = render(<CancelButton onClick={onClick} />)
    fireEvent.click(getByText('Cancel'))
    expect(onClick).toHaveBeenCalled()
  })
})
