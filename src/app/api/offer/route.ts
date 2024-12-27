import { NextRequest, NextResponse } from 'next/server'
import { channelRepo } from '../../../channel'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { slug, offer } = await request.json()

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  if (!offer) {
    return NextResponse.json({ error: 'Offer is required' }, { status: 400 })
  }

  const offerID = await channelRepo.offer(slug, offer)
  return NextResponse.json({ offerID })
}
