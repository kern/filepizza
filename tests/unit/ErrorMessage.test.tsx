/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ErrorMessage } from '../../src/components/ErrorMessage'

describe('ErrorMessage', () => {
  it('renders message', () => {
    const { getByText } = render(<ErrorMessage message="oops" />)
    expect(getByText('oops')).toBeInTheDocument()
  })
})
