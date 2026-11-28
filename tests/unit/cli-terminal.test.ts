// @vitest-environment node

import { expect, it } from 'vitest'
import { createTerminal, percent } from '../../cli/terminal'

function output(isTTY: boolean) {
  const written: string[] = []
  return {
    written,
    out: { isTTY, write: (text: string) => written.push(text) },
  }
}

it('prints lines, and rewrites the status in place on a terminal', () => {
  const { written, out } = output(true)
  const terminal = createTerminal(out)
  terminal.line('one')
  terminal.status('50%')
  terminal.status('60%')
  terminal.line('two')
  terminal.clear()
  terminal.clear()
  expect(written).toEqual([
    'one\n',
    '\r\x1b[K50%',
    '\r\x1b[K60%',
    '\r\x1b[K',
    'two\n',
  ])
})

it('leaves the status out when the output is not a terminal', () => {
  const { written, out } = output(false)
  const terminal = createTerminal(out)
  terminal.status('50%')
  terminal.line('done')
  expect(written).toEqual(['done\n'])
})

it('works out percentages, counting an empty file as complete', () => {
  expect(percent(1, 3)).toBe(33)
  expect(percent(3, 3)).toBe(100)
  expect(percent(0, 0)).toBe(100)
})
