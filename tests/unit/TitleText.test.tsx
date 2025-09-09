/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TitleText from '../../src/components/TitleText'

describe('TitleText', () => {
  it('renders children', () => {
    const { getByText } = render(<TitleText>hello</TitleText>)
    expect(getByText('hello')).toBeInTheDocument()
  })
})
