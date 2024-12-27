import { NextResponse } from 'next/server'
import { Channel, channelRepo } from '../../../channel'

export async function POST(): Promise<NextResponse> {
  const channel: Channel = await channelRepo.create()
  return NextResponse.json(channel)
}
