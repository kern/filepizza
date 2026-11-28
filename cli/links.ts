import { UsageError } from './args'

export type DownloadLink = { server: string; slug: string }

// Accepts a full download link (https://host/download/<slug>) or a bare slug.
// A full link says which server to talk to; a bare slug uses `server`.
export function parseLink(input: string, server: string): DownloadLink {
  const text = input.trim()

  if (/^https?:\/\//i.test(text)) {
    let url: URL
    try {
      url = new URL(text)
    } catch {
      throw new UsageError(`"${input}" is not a valid link.`)
    }
    const match = /^\/download\/(.+?)\/*$/.exec(url.pathname)
    if (!match) {
      throw new UsageError(`"${input}" is not a FilePizza download link.`)
    }
    return { server: url.origin, slug: decodeURIComponent(match[1]) }
  }

  const slug = text.replace(/^\/+|\/+$/g, '')
  if (!slug) throw new UsageError('Give a download link or code.')
  return { server, slug }
}
