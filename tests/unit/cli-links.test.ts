// @vitest-environment node

import { expect, it } from 'vitest'
import { UsageError } from '../../cli/args'
import { parseLink } from '../../cli/links'

const SERVER = 'https://file.pizza'

it('reads the server and slug from a full link', () => {
  expect(parseLink('https://pizza.test/download/abcd1234', SERVER)).toEqual({
    server: 'https://pizza.test',
    slug: 'abcd1234',
  })
  expect(parseLink('http://localhost:3000/download/a/b/c/d/', SERVER)).toEqual({
    server: 'http://localhost:3000',
    slug: 'a/b/c/d',
  })
  expect(
    parseLink('  HTTPS://pizza.test/download/caf%C3%A9  ', SERVER),
  ).toEqual({ server: 'https://pizza.test', slug: 'café' })
})

it('takes a bare code from the given server', () => {
  expect(parseLink('abcd1234', SERVER)).toEqual({
    server: SERVER,
    slug: 'abcd1234',
  })
  expect(parseLink('/a/b/c/d/', SERVER)).toEqual({
    server: SERVER,
    slug: 'a/b/c/d',
  })
})

it('rejects what is not a download link', () => {
  for (const input of [
    '',
    '   ',
    '/',
    'http://',
    'https://pizza.test/',
    'https://pizza.test/other/abc',
  ]) {
    expect(() => parseLink(input, SERVER)).toThrow(UsageError)
  }
})
