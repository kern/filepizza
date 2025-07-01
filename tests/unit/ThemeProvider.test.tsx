/// <reference types="@testing-library/jest-dom" />
Object.defineProperty(window, "matchMedia", { value: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }) })
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ThemeProvider } from '../../src/components/ThemeProvider'

describe('ThemeProvider', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>,
    )
    expect(getByText('child')).toBeInTheDocument()
  })
})
