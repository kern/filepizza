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
      const buffer = new Uint32Array(1)
      if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(buffer)
      } else {
        crypto.randomFillSync(buffer)
      }
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

export const generateShortSlug = (): string => {
  return generateRandomWord(config.shortSlug.chars, config.shortSlug.numChars)
}

export const generateLongSlug = async (): Promise<string> => {
  const parts = await generateRandomWords(
    config.longSlug.words,
    config.longSlug.numWords,
  )
  return parts.join('/')
}

export const generateRetrieveCode = (): string => {
  return generateRandomWord(
    config.retrieveCodeSlug.chars,
    config.retrieveCodeSlug.numChars,
  )
}

const generateRandomWord = (wordList: string, wordLength: number): string => {
  let result = ''
  for (let i = 0; i < wordLength; i++) {
    result += wordList[Math.floor(Math.random() * wordList.length)]
  }
  return result
}
