import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  console.log('[API] peerjs-servers called, PEERJS_SERVERS:', process.env.PEERJS_SERVERS)

  const peerServers = process.env.PEERJS_SERVERS
    ? process.env.PEERJS_SERVERS.split(',').map(url => url.trim())
    : [];

  console.log('[API] returning servers:', peerServers)
  return NextResponse.json({ servers: peerServers });
}