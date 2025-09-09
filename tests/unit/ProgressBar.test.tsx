/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ProgressBar from '../../src/components/ProgressBar'

describe('ProgressBar', () => {
  it('shows percentage', () => {
    const { getAllByText } = render(<ProgressBar value={50} max={100} />)
    expect(getAllByText('50%').length).toBeGreaterThan(0)
  })
})
