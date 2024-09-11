import { NextRequest, NextResponse } from 'next/server'
import { Channel, channelRepo } from '../../../channel'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { uploaderPeerID } = await request.json()

  if (!uploaderPeerID) {
    return NextResponse.json(
      { error: 'uploaderPeerID is required' },
      { status: 400 },
    )
  }

  const channel: Channel = await channelRepo.create(uploaderPeerID)
  return NextResponse.json(channel)
}
