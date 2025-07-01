/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render } from '@testing-library/react'
import { act } from 'react'
import { describe, it, expect } from 'vitest'
import Spinner from '../../src/components/Spinner'
import { setRotating } from '../../src/hooks/useRotatingSpinner'

describe('Spinner', () => {
  it('reflects rotating state', () => {
    // @ts-ignore
    act(() => { setRotating(true) })
// @ts-ignore
    const { getByLabelText } = render(<Spinner />)
    expect(getByLabelText('Rotating pizza')).toBeInTheDocument()
    // @ts-ignore
    act(() => { setRotating(false) })
  })
})
