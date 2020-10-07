import type { Request, Response } from 'express'
import { channelRepo } from '../../channel'

export default (req: Request, res: Response): void => {
  // TODO: validate method and uploaderPeerID

  channelRepo
    .create(req.body.uploaderPeerID)
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
