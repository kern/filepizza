/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PasswordField from '../../src/components/PasswordField'

describe('PasswordField', () => {
  it('calls onChange', () => {
    let val = ''
    const { getByPlaceholderText } = render(
      <PasswordField value="" onChange={(v) => (val = v)} />,
    )
    fireEvent.change(
      getByPlaceholderText(
        'Enter a secret password for this slice of FilePizza...',
      ),
      {
        target: { value: 'a' },
      },
    )
    expect(val).toBe('a')
  })
})

it('shows the required label and invalid styling', () => {
  const { getByText, getByPlaceholderText } = render(
    <PasswordField value="wrong" onChange={() => {}} isRequired isInvalid />,
  )
  expect(getByText('Password')).toHaveClass('text-red-500')
  expect(getByPlaceholderText(/secret password/)).toHaveClass('border-red-500')
})
