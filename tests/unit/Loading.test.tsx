/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Loading from '../../src/components/Loading'

describe('Loading', () => {
  it('renders text', () => {
    const { getByText } = render(<Loading text="wait" />)
    expect(getByText('wait')).toBeInTheDocument()
  })
})
