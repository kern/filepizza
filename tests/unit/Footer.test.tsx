/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Footer from '../../src/components/Footer'

Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
})

describe('Footer', () => {
  it('redirects to donate link', () => {
    const { getByText } = render(<Footer />)
    fireEvent.click(getByText('Donate'))
    expect(window.location.href).toContain('coinbase')
  })
})
