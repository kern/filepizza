import toppings from './toppings'
import xkcdPassword from 'xkcd-password'

const TOKEN_OPTIONS = {
  numWords: 4,
  minLength: 3,
  maxLength: 20
}

let tokens = {}
const tokenGenerator = new xkcdPassword()
tokenGenerator.initWithWordList(toppings)

export function create(socket) {

  return tokenGenerator.generate(TOKEN_OPTIONS).then((parts) => {
    const token = parts.join('-')
    let result = {
      token: token,
      socket: socket
    }

    tokens[token] = result
    return result
  })

}

export function exists(token) {
  return token in tokens
}

export function find(token) {
  return tokens[token]
}
 
export function remove(client) {
  if (client == null) return
  delete tokens[client.token]
}
