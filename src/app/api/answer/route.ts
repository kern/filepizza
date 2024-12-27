import { NextRequest, NextResponse } from 'next/server'
import { channelRepo } from '../../../channel'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { slug, offerID, answer } = await request.json()

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  if (!offerID) {
    return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 })
  }

  if (!answer) {
    return NextResponse.json({ error: 'Answer is required' }, { status: 400 })
  }

  const success = await channelRepo.answer(slug, offerID, answer)
  return NextResponse.json({ success })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const offerID = searchParams.get('offerID')

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  if (!offerID) {
    return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 })
  }

  const answer = await channelRepo.fetchAnswer(slug, offerID)
  return NextResponse.json({ answer })
}
