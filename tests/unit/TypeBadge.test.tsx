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

it.each([
  ['image/png', 'bg-blue-100'],
  ['audio/wav', 'bg-purple-100'],
  ['video/mp4', 'bg-red-100'],
  ['application/zip', 'bg-stone-100'],
])('uses the badge color for %s', (type, color) => {
  const { getByText } = render(<TypeBadge type={type} />)
  expect(getByText(type)).toHaveClass(color)
})
