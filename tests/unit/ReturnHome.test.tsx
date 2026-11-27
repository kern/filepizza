/// <reference types="@testing-library/jest-dom" />
import { TestRouter } from '../support/providers'
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ReturnHome from '../../src/components/ReturnHome'

describe('ReturnHome', () => {
  it('links to home', () => {
    const { getByText } = render(<ReturnHome />, { wrapper: TestRouter })
    expect(getByText(/Serve up/).getAttribute('href')).toBe('/')
  })
})
