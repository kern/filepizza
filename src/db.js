import toppings from './toppings'
import xkcdPassword from 'xkcd-password'

const TOKEN_OPTIONS = {
  numWords: 4,
  minLength: 3,
  maxLength: 20
}

const SHORT_TOKEN_OPTIONS = {
  length: 8,
  chars: '0123456789abcdefghijklmnopqrstuvwxyz'
}

let tokens = {}
let shortTokens = {}

const tokenGenerator = new xkcdPassword()
tokenGenerator.initWithWordList(toppings)

function generateShortToken() {
  var result = '';
  for (var i = SHORT_TOKEN_OPTIONS.length; i > 0; --i)
    result += SHORT_TOKEN_OPTIONS.chars[Math.floor(Math.random() * SHORT_TOKEN_OPTIONS.chars.length)];
  return result;
}

export function create(socket) {

  return tokenGenerator.generate(TOKEN_OPTIONS).then((parts) => {
    const token = parts.join('/')
    const shortToken = generateShortToken()
    let result = {
      token: token,
      shortToken: shortToken,
      socket: socket
    }

    tokens[token] = result
    shortTokens[shortToken] = result
    return result
  })

}

export function find(token) {
  return tokens[token]
}

export function findShort(shortToken) {
  return shortTokens[shortToken.toLowerCase()]
}
 
export function remove(client) {
  if (client == null) return
  delete tokens[client.token]
  delete shortTokens[client.shortToken]
}
