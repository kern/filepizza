import { render, fireEvent } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import { ModeToggle } from '../../src/components/ModeToggle'
import { ThemeProvider } from '../../src/components/ThemeProvider'

describe('ModeToggle', () => {
  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('toggles the active theme in both directions', () => {
    const { getByRole } = render(
      <ThemeProvider defaultTheme="light">
        <ModeToggle />
      </ThemeProvider>,
    )
    const button = getByRole('button', { name: 'Toggle mode' })

    fireEvent.click(button)
    expect(document.documentElement).toHaveClass('dark')
    fireEvent.click(button)
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
