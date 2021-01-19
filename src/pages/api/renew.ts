import { NextApiRequest, NextApiResponse } from 'next'
import { channelRepo } from '../../channel'
import { routeHandler, getBodyKey } from '../../routes'

export default routeHandler<void>(
  (req: NextApiRequest, _res: NextApiResponse): Promise<void> => {
    const slug = getBodyKey(req, 'slug')
    return channelRepo.renew(slug)
  },
)
