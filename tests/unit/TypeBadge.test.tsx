/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TypeBadge from '../../src/components/TypeBadge'

describe('TypeBadge', () => {
  it('renders type', () => {
    const { getByText } = render(<TypeBadge type="image/png" />)
    expect(getByText('image/png')).toBeInTheDocument()
  })
})
