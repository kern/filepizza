import { NextApiRequest, NextApiResponse } from 'next'
import config from './config'

export type APIError = Error & { statusCode?: number }

export type BodyKey = keyof typeof config.bodyKeys

export function throwAPIError(message: string, statusCode = 500): void {
  const err = new Error(message) as APIError
  err.statusCode = statusCode
  throw err
}

export function routeHandler<T>(
  fn: (req: NextApiRequest, res: NextApiResponse) => Promise<T>,
): (req: NextApiRequest, res: NextApiResponse) => Promise<void> {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.json({ error: 'method not allowed' })
      return
    }

    try {
      const result = await fn(req, res)
      res.statusCode = 200
      res.json(result)
    } catch (err) {
      res.statusCode = err.statusCode || 500
      res.json({ error: err.message })
    }
  }
}

export function getBodyKey(req: NextApiRequest, key: BodyKey): string {
  const { min, max } = config.bodyKeys[key]

  const val = req.body[key]

  if (typeof val !== 'string') {
    throwAPIError(`${key} must be a string`)
  }

  if (val.length < min) {
    throwAPIError(`${key} must be at least ${min} chars`)
  }

  if (val.length > max) {
    throwAPIError(`${key} must be at most ${max} chars`)
  }

  return val
}
