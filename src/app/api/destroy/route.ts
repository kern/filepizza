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

  try {
    await channelRepo.destroy(slug, secret)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to destroy channel' },
      { status: 500 },
    )
  }
}
