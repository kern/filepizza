/// <reference types="@testing-library/jest-dom" />
vi.mock("next-view-transitions", () => ({ Link: (p: any) => <a {...p}>{p.children}</a> }))
import { vi } from "vitest"
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ReturnHome from '../../src/components/ReturnHome'

describe('ReturnHome', () => {
  it('links to home', () => {
    const { getByText } = render(<ReturnHome />)
    expect(getByText(/Serve up/).getAttribute('href')).toBe('/')
  })
})
