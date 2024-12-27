import { NextResponse } from 'next/server'
import { Channel, channelRepo } from '../../../channel'

export async function POST(request: Request): Promise<NextResponse> {
  const { uploaderPeerID } = await request.json()

  if (!uploaderPeerID) {
    return NextResponse.json({ error: 'Uploader peer ID is required' }, { status: 400 })
  }

  const channel: Channel = await channelRepo.createChannel(uploaderPeerID)
  return NextResponse.json(channel)
}
