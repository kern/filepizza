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
    fireEvent.change(getByPlaceholderText('Enter a secret password for this slice of FilePizza...'), {
      target: { value: 'a' },
    })
    expect(val).toBe('a')
  })
})
