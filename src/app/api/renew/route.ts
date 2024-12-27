import { NextRequest, NextResponse } from 'next/server'
import { channelRepo } from '../../../channel'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { slug, secret } = await request.json()

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  if (!secret) {
    return NextResponse.json({ error: 'Secret is required' }, { status: 400 })
  }

  const success = await channelRepo.renewChannel(slug, secret)
  return NextResponse.json({ success })
}
