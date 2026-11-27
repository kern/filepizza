// @vitest-environment node

import { expect, it } from 'vitest'
import config from '../../src/config'
import { generateLongSlug, generateShortSlug } from '../../src/slugs'

it('generates channel slugs from the configured alphabet and word list', async () => {
  expect(await generateShortSlug()).toMatch(/^[a-z0-9]{8}$/)
  const words = (await generateLongSlug()).split('/')
  expect(words).toHaveLength(config.longSlug.numWords)
  for (const word of words) expect(config.longSlug.words).toContain(word)
})

it('rejects invalid slug configuration', async () => {
  const original = { ...config.longSlug }
  try {
    config.longSlug.words = []
    await expect(generateLongSlug()).rejects.toThrow(
      'Word list must be a non-empty array',
    )
    config.longSlug.words = original.words
    config.longSlug.numWords = 0
    await expect(generateLongSlug()).rejects.toThrow(
      'Number of words must be greater than zero',
    )
  } finally {
    Object.assign(config.longSlug, original)
  }
})
