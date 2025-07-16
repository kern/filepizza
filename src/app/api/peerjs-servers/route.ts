import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  const peerServers = process.env.PEERJS_SERVERS
    ? process.env.PEERJS_SERVERS.split(',').map(url => url.trim())
    : [];

  return NextResponse.json({ servers: peerServers });
}