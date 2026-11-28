import toppings from './toppings'

export default {
  redisURL: 'redis://localhost:6379/0',
  channel: {
    ttl: 60 * 60, // 1 hour
  },
  shortSlug: {
    numChars: 8,
    chars: '0123456789abcdefghijklmnopqrstuvwxyz',
    maxAttempts: 8,
  },
  longSlug: {
    numWords: 4,
    words: toppings,
    maxAttempts: 8,
  },
}
