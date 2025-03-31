import 'server-only'
import crypto from 'crypto'
import config from './config'

/**
 * Generates an array of random words from a given word list.
 *
 * @param wordList - An array of words to choose from.
 * @param numWords - The number of words to generate.
 * @returns A Promise that resolves to an array of randomly selected words.
 */
function generateRandomWords(
  wordList: string[],
  numWords: number,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(wordList) || wordList.length === 0) {
      reject(new Error('Word list must be a non-empty array'))
      return
    }

    if (numWords <= 0) {
      reject(new Error('Number of words must be greater than zero'))
      return
    }

    const getRandomInt = (max: number): number => {
      const limit = 4294967295 - (4294967295 % max) // uint32 max

      let buffer = new Uint32Array(1)
      do {
        if (typeof window !== 'undefined' && window.crypto) {
          window.crypto.getRandomValues(buffer)
        } else {
          crypto.randomFillSync(buffer)
        }
      } while (buffer[0] >= limit)

      return buffer[0] % max
    }

    const result: string[] = []
    for (let i = 0; i < numWords; i++) {
      const randomIndex = getRandomInt(wordList.length)
      result.push(wordList[randomIndex])
    }

    resolve(result)
  })
}

export const generateShortSlug = async (): Promise<string> => {
  const parts = await generateRandomWords(
    config.shortSlug.chars.split(''),
    config.shortSlug.numChars,
  )
  return parts.join('')
}

export const generateLongSlug = async (): Promise<string> => {
  const parts = await generateRandomWords(
    config.longSlug.words,
    config.longSlug.numWords,
  )
  return parts.join('/')
}
