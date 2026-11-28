import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from './fixtures'
import { createBrowserContexts, selectFile, startUpload } from './helpers'

// The command line client (cli/) talking to the web app and to itself. It runs
// with Bun, which these tests need; without it they are skipped.
const hasBun = spawnSync('bun', ['--version']).status === 0
const SERVER = 'http://localhost:3000'

function runCli(args: string[], env: Record<string, string> = {}) {
  const child = spawn('bun', ['cli/main.ts', ...args], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => (stdout += chunk))
  child.stderr.on('data', (chunk) => (stderr += chunk))
  const exited = new Promise<number>((resolve) =>
    child.on('exit', (code) => resolve(code ?? -1)),
  )
  return {
    exited,
    stdout: () => stdout,
    stderr: () => stderr,
    kill: () => child.kill('SIGKILL'),
    // Resolves with the first match of `pattern` in what has been printed.
    async waitFor(pattern: RegExp, timeoutMs = 30_000): Promise<string> {
      const deadline = Date.now() + timeoutMs
      while (Date.now() < deadline) {
        const match = pattern.exec(stdout)
        if (match) return match[0]
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      throw new Error(
        `Never saw ${pattern} in the output.\nstdout: ${stdout}\nstderr: ${stderr}`,
      )
    },
  }
}

const SHARE_LINK = /http:\/\/localhost:3000\/download\/[a-z0-9]+/

test.describe('command line client', () => {
  test.skip(!hasBun, 'Bun is not installed')
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'The client does not depend on the browser engine',
  )

  test('a file sent from the command line downloads in the browser', async ({
    page,
  }, testInfo) => {
    const content = 'pizza from the terminal\n'.repeat(1000)
    const file = testInfo.outputPath('terminal.txt')
    writeFileSync(file, content)

    const sender = runCli(['send', '--server', SERVER, '--once', file])
    try {
      const link = await sender.waitFor(SHARE_LINK)
      await page.goto(link)
      await expect(page.getByText('terminal.txt')).toBeVisible({
        timeout: 15000,
      })
      const downloading = page.waitForEvent('download')
      await page.locator('#download-button').click()
      const download = await downloading
      expect(download.suggestedFilename()).toBe('terminal.txt')
      const saved = testInfo.outputPath('saved.txt')
      await download.saveAs(saved)
      expect(readFileSync(saved, 'utf8')).toBe(content)

      await expect(page.getByText(/You downloaded/i)).toBeVisible()
      expect(await sender.exited).toBe(0)
      expect(sender.stdout()).toContain('finished downloading everything')
    } finally {
      sender.kill()
    }
  })

  test('a folder sent from the command line downloads in the browser as one zip', async ({
    page,
  }, testInfo) => {
    const folder = testInfo.outputPath('toppings')
    mkdirSync(join(folder, 'cheese'), { recursive: true })
    writeFileSync(join(folder, 'basil.txt'), 'basil')
    writeFileSync(join(folder, 'cheese', 'mozzarella.txt'), 'mozzarella')

    const sender = runCli(['send', '--server', SERVER, '--once', folder])
    try {
      await page.goto(await sender.waitFor(SHARE_LINK))
      await expect(page.getByText('toppings/basil.txt')).toBeVisible({
        timeout: 15000,
      })
      await expect(
        page.getByText('toppings/cheese/mozzarella.txt'),
      ).toBeVisible()
      const downloading = page.waitForEvent('download')
      await page.locator('#download-button').click()
      expect((await downloading).suggestedFilename()).toMatch(/\.zip$/)
      expect(await sender.exited).toBe(0)
    } finally {
      sender.kill()
    }
  })

  test('a file uploaded in the browser is received on the command line', async ({
    browser,
  }, testInfo) => {
    const content = 'pizza from the browser\n'.repeat(5000)
    const { uploaderPage, cleanup } = await createBrowserContexts(browser)
    const output = testInfo.outputPath('received')
    try {
      await selectFile(uploaderPage, 'browser.txt', content)
      const link = await startUpload(uploaderPage)

      const receiver = runCli(['receive', '--output', output, link])
      try {
        expect(await receiver.exited).toBe(0)
        expect(receiver.stdout()).toContain('Done.')
        expect(readFileSync(join(output, 'browser.txt'), 'utf8')).toBe(content)
        await expect(
          uploaderPage.getByText('DONE', { exact: true }),
        ).toBeVisible()
      } finally {
        receiver.kill()
      }
    } finally {
      await cleanup()
    }
  })

  test('two command line clients exchange files, folders and empty files', async ({
    browserName: _browserName,
  }, testInfo) => {
    const source = testInfo.outputPath('source')
    mkdirSync(join(source, 'album'), { recursive: true })
    const big = Buffer.alloc(1_500_000)
    for (let i = 0; i < big.length; i++) big[i] = (i * 7 + (i >> 8)) & 255
    writeFileSync(join(source, 'big.bin'), big)
    writeFileSync(join(source, 'album', 'empty.txt'), '')
    writeFileSync(join(source, 'album', 'note.txt'), 'hello\n')
    const output = testInfo.outputPath('received')

    const sender = runCli([
      'send',
      '--server',
      SERVER,
      '--once',
      join(source, 'big.bin'),
      join(source, 'album'),
    ])
    try {
      // A bare code works too, with the server given separately.
      const code = (await sender.waitFor(SHARE_LINK)).split('/').pop()!
      const receiver = runCli([
        'receive',
        '--server',
        SERVER,
        '-o',
        output,
        code,
      ])
      expect(await receiver.exited).toBe(0)
      expect(await sender.exited).toBe(0)

      expect(readFileSync(join(output, 'big.bin')).equals(big)).toBe(true)
      expect(readFileSync(join(output, 'album', 'empty.txt'), 'utf8')).toBe('')
      expect(readFileSync(join(output, 'album', 'note.txt'), 'utf8')).toBe(
        'hello\n',
      )
    } finally {
      sender.kill()
    }
  })

  test('a password is required, and a wrong one is refused', async ({
    browserName: _browserName,
  }, testInfo) => {
    const file = testInfo.outputPath('secret.txt')
    writeFileSync(file, 'for your eyes only')
    const output = testInfo.outputPath('received')

    const sender = runCli(['send', '--server', SERVER, '--once', file], {
      FILEPIZZA_PASSWORD: 'extra-cheese',
    })
    try {
      const link = await sender.waitFor(SHARE_LINK)

      const none = runCli(['receive', '-o', output, link])
      expect(await none.exited).toBe(1)
      expect(none.stderr()).toContain('needs a password')

      const wrong = runCli([
        'receive',
        '-o',
        output,
        '-p',
        'no-pineapple',
        link,
      ])
      expect(await wrong.exited).toBe(1)
      expect(wrong.stderr()).toContain('password was not accepted')

      const right = runCli([
        'receive',
        '-o',
        output,
        '-p',
        'extra-cheese',
        link,
      ])
      expect(await right.exited).toBe(0)
      expect(readFileSync(join(output, 'secret.txt'), 'utf8')).toBe(
        'for your eyes only',
      )
      expect(await sender.exited).toBe(0)
    } finally {
      sender.kill()
    }
  })

  test('an expired or unknown link is reported clearly', async ({
    browserName: _browserName,
  }, testInfo) => {
    const receiver = runCli([
      'receive',
      '-o',
      testInfo.outputPath('received'),
      `${SERVER}/download/doesnotexist`,
    ])
    expect(await receiver.exited).toBe(1)
    expect(receiver.stderr()).toContain('link was not found')
  })
})
