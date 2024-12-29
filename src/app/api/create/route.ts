import { NextResponse } from 'next/server'
import { getOrCreateChannelRepo } from '../../../channel'

export async function POST(request: Request): Promise<NextResponse> {
  const { uploaderPeerID } = await request.json()

  if (!uploaderPeerID) {
    return NextResponse.json(
      { error: 'Uploader peer ID is required' },
      { status: 400 },
    )
  }

  const channel = await getOrCreateChannelRepo().createChannel(uploaderPeerID)
  return NextResponse.json(channel)
}
