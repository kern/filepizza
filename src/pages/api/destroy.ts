import type { Request, Response } from 'express'
import { channelRepo } from '../../channel'

export default (req: Request, res: Response): void => {
  // TODO: validate method and slug

  channelRepo
    .destroy(req.body.slug)
    .then((channel) => {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(channel))
    })
    .catch((err) => {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err.toString() }))
    })
}
