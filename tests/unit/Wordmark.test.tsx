/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Wordmark from '../../src/components/Wordmark'

describe('Wordmark', () => {
  it('renders svg', () => {
    const { getByLabelText } = render(<Wordmark />)
    expect(getByLabelText('FilePizza logo')).toBeInTheDocument()
  })
})
