import { NextApiRequest, NextApiResponse } from 'next'
import { Channel, channelRepo } from '../../channel'
import { routeHandler, getBodyKey } from '../../routes'

export default routeHandler<Channel>(
  (req: NextApiRequest, _res: NextApiResponse): Promise<Channel> => {
    const uploaderPeerID = getBodyKey(req, 'uploaderPeerID')
    return channelRepo.create(uploaderPeerID)
  },
)
