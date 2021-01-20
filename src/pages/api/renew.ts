import { NextApiRequest, NextApiResponse } from 'next'
import { channelRepo } from '../../channel'
import { routeHandler, getBodyKey } from '../../routes'

export default routeHandler<boolean>(
  async (req: NextApiRequest, _res: NextApiResponse): Promise<boolean> => {
    const slug = getBodyKey(req, 'slug')
    await channelRepo.renew(slug)
    return true
  },
)
