/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TermsAcceptance from '../../src/components/TermsAcceptance'

describe('TermsAcceptance', () => {
  it('opens modal', () => {
    const { getByText } = render(<TermsAcceptance />)
    fireEvent.click(getByText('our terms'))
    expect(getByText('FilePizza Terms')).toBeInTheDocument()
  })
})
