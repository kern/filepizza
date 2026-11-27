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

it('keeps the dialog open on content clicks and closes with either dismissal', () => {
  const { getByRole, queryByRole } = render(<TermsAcceptance />)
  const open = getByRole('button', { name: 'View upload terms' })
  fireEvent.click(open)
  fireEvent.click(getByRole('heading', { name: 'FilePizza Terms' }))
  expect(getByRole('dialog')).toBeInTheDocument()
  fireEvent.click(getByRole('button', { name: 'Got it!' }))
  expect(queryByRole('dialog')).toBeNull()

  fireEvent.click(open)
  fireEvent.click(getByRole('dialog'))
  expect(queryByRole('dialog')).toBeNull()
})
