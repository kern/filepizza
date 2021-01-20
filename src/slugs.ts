import xkcdPassword from 'xkcd-password'
import config from './config'

export const generateShortSlug = (): string => {
  let result = ''
  for (let i = 0; i < config.shortSlug.numChars; i++) {
    result +=
      config.shortSlug.chars[
        Math.floor(Math.random() * config.shortSlug.chars.length)
      ]
  }
  return result
}

const longSlugGenerator = new xkcdPassword()
longSlugGenerator.initWithWordList(config.longSlug.words)

export const generateLongSlug = async (): Promise<string> => {
  const parts = await longSlugGenerator.generate({
    numWords: config.longSlug.numWords,
    minLength: 1,
    maxLength: 256,
  })
  return parts.join('/')
}
