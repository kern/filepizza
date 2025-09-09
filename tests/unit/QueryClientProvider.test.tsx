/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FilePizzaQueryClientProvider from '../../src/components/QueryClientProvider'

describe('QueryClientProvider', () => {
  it('renders children', () => {
    const { getByText } = render(
      <FilePizzaQueryClientProvider>
        <span>child</span>
      </FilePizzaQueryClientProvider>,
    )
    expect(getByText('child')).toBeInTheDocument()
  })
})
