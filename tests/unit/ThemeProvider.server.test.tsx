// @vitest-environment node

import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { ThemeProvider } from '../../src/components/ThemeProvider'

it('renders on the server without touching browser APIs', () => {
  expect(
    renderToStaticMarkup(
      <ThemeProvider defaultTheme="dark">
        <p>server</p>
      </ThemeProvider>,
    ),
  ).toBe('<p>server</p>')
})
