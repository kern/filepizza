import { render, fireEvent } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'
import { ModeToggle } from '../../src/components/ModeToggle'
import { ThemeProvider } from '../../src/components/ThemeProvider'

describe('ModeToggle', () => {
  afterEach(() => {
    localStorage.removeItem('test-mode')
  })

  it('toggles the active theme in both directions', () => {
    const { getByRole } = render(
      <ThemeProvider
        defaultTheme="light"
        enableSystem={false}
        storageKey="test-mode"
      >
        <ModeToggle />
      </ThemeProvider>,
    )
    const button = getByRole('button', { name: 'Toggle mode' })

    fireEvent.click(button)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    fireEvent.click(button)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
})
