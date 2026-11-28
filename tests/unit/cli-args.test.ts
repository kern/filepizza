// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { DEFAULT_SERVER, UsageError, USAGE, parseCommand } from '../../cli/args'

describe('parseCommand', () => {
  it('shows help and the version', () => {
    for (const argv of [[], ['help'], ['-h'], ['--help'], ['send', '-h']]) {
      expect(parseCommand(argv)).toEqual({ kind: 'help' })
    }
    for (const argv of [['version'], ['-v'], ['--version']]) {
      expect(parseCommand(argv)).toEqual({ kind: 'version' })
    }
    expect(USAGE).toContain('filepizza send')
  })

  it('reads send options and the files to send', () => {
    expect(
      parseCommand([
        'send',
        '-s',
        'http://localhost:3000/',
        '-p',
        'x',
        '--once',
        'a',
        'b/',
      ]),
    ).toEqual({
      kind: 'send',
      server: 'http://localhost:3000',
      password: 'x',
      once: true,
      paths: ['a', 'b/'],
    })
  })

  it('defaults the server and takes server and password from the environment', () => {
    expect(parseCommand(['send', 'a'])).toEqual({
      kind: 'send',
      server: DEFAULT_SERVER,
      password: undefined,
      once: false,
      paths: ['a'],
    })
    expect(
      parseCommand(['send', 'a'], {
        FILEPIZZA_SERVER: 'https://pizza.example.com',
        FILEPIZZA_PASSWORD: 'secret',
      }),
    ).toMatchObject({ server: 'https://pizza.example.com', password: 'secret' })
    // An option beats the environment, and an empty password means none.
    expect(
      parseCommand(['send', '-p', '', 'a'], { FILEPIZZA_PASSWORD: 'secret' }),
    ).toMatchObject({ password: undefined })
  })

  it('reads receive options and the link', () => {
    expect(
      parseCommand(['receive', '-o', 'out', '-f', '-p', 'x', 'abcd']),
    ).toEqual({
      kind: 'receive',
      server: DEFAULT_SERVER,
      serverGiven: false,
      password: 'x',
      output: 'out',
      force: true,
      link: 'abcd',
    })
    expect(
      parseCommand(['receive', '--server', 'http://localhost:3000', 'abcd']),
    ).toMatchObject({
      server: 'http://localhost:3000',
      serverGiven: true,
      output: '.',
      force: false,
    })
    expect(
      parseCommand(['receive', 'abcd'], { FILEPIZZA_SERVER: 'http://a.test' }),
    ).toMatchObject({ serverGiven: true })
  })

  it('explains what is wrong', () => {
    const bad: Array<[string[], RegExp]> = [
      [['bogus'], /Unknown command "bogus"/],
      [['send', '--nope', 'a'], /nope/],
      [['send'], /at least one file/],
      [['send', '--output', 'x', 'a'], /only apply to "receive"/],
      [['send', '--force', 'a'], /only apply to "receive"/],
      [['send', '-s', 'not a url', 'a'], /not a valid server URL/],
      [['send', '-s', 'ftp://example.com', 'a'], /http or https/],
      [['receive'], /exactly one/],
      [['receive', 'a', 'b'], /exactly one/],
      [['receive', '--once', 'a'], /only applies to "send"/],
    ]
    for (const [argv, message] of bad) {
      expect(() => parseCommand(argv)).toThrow(UsageError)
      expect(() => parseCommand(argv)).toThrow(message)
    }
  })
})
