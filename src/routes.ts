import config from './config'

export type ApiRequest = { method?: string; body: Record<string, unknown> }
export type ApiResponse = {
  statusCode: number
  json: (body: unknown) => void
}

export type APIError = Error & { statusCode?: number }

export type BodyKey = keyof typeof config.bodyKeys

export function throwAPIError(message: string, statusCode = 500): never {
  const err = new Error(message) as APIError
  err.statusCode = statusCode
  throw err
}

export function routeHandler<T>(
  fn: (req: ApiRequest, res: ApiResponse) => Promise<T>,
): (req: ApiRequest, res: ApiResponse) => Promise<void> {
  return async (req: ApiRequest, res: ApiResponse): Promise<void> => {
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

export function getBodyKey(req: ApiRequest, key: BodyKey): string {
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
