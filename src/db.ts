import xkcdPassword from "xkcd-password";
import toppings from "./toppings";

const TOKEN_OPTIONS = {
  numWords: 4,
  minLength: 3,
  maxLength: 20,
}

const SHORT_TOKEN_OPTIONS = {
  length: 8,
  chars: '0123456789abcdefghijklmnopqrstuvwxyz',
}

const tokens = {}
const shortTokens = {}

const tokenGenerator = new xkcdPassword()
tokenGenerator.initWithWordList(toppings)

function generateShortToken() {
  let result = '';
  for (let i = SHORT_TOKEN_OPTIONS.length; i > 0; --i) {
  { result += SHORT_TOKEN_OPTIONS.chars[Math.floor(Math.random() * SHORT_TOKEN_OPTIONS.chars.length)]}
  return result;
}

export function create(socket) {
  return tokenGenerator.generate(TOKEN_OPTIONS).then((parts) => {
    const token = parts.join('/')
;const shortToken = generateShortToken()
    const result = {
      token,
      shortToken,
      socket,
    }

    tokens[token] = result
    shortTokens[shortToken] = result
    return result
  });
}

export function find(token) {
  return tokens[token]
}

export function findShort(shortToken) {
  return shortTokens[shortToken.toLowerCase()]
}
