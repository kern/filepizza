import { readdir, stat } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { UsageError } from './args'

export type SendFile = {
  // Where the file is on this machine.
  path: string
  // The name the downloader sees; folders keep their layout ("folder/a.txt").
  fileName: string
  size: number
  type: string
}

const MIME_TYPES: Record<string, string> = {
  csv: 'text/csv',
  gif: 'image/gif',
  html: 'text/html',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  md: 'text/markdown',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  pdf: 'application/pdf',
  png: 'image/png',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  webp: 'image/webp',
  zip: 'application/zip',
}

export function mimeType(name: string): string {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  return MIME_TYPES[extension] ?? 'application/octet-stream'
}

// A file name chosen by the other side is only a hint about what to call the
// file. Turn it into a relative path that stays inside the download folder, or
// refuse it: no absolute paths, drive letters or ".." segments.
export function safeRelativePath(fileName: string): string | null {
  if (fileName.includes('\0')) return null
  const parts = fileName
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part !== '' && part !== '.')
  if (parts.length === 0) return null
  if (parts.some((part) => part === '..')) return null
  if (/^[A-Za-z]:$/.test(parts[0])) return null
  return parts.join('/')
}

async function walk(
  directory: string,
  prefix: string,
  into: SendFile[],
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true })
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    const fileName = `${prefix}/${entry.name}`
    if (entry.isDirectory()) {
      await walk(path, fileName, into)
    } else if (entry.isFile()) {
      into.push({
        path,
        fileName,
        size: (await stat(path)).size,
        type: mimeType(entry.name),
      })
    }
    // Links, sockets and the like are skipped.
  }
}

// Files are shared under their own name; a folder is shared with everything
// inside it, under "<folder name>/<path inside>".
export async function collectFiles(paths: string[]): Promise<SendFile[]> {
  const files: SendFile[] = []
  for (const given of paths) {
    let info
    try {
      info = await stat(given)
    } catch (error) {
      throw new UsageError(
        `Cannot read "${given}": ${(error as Error).message}`,
      )
    }
    const path = resolve(given)
    if (info.isDirectory()) {
      await walk(path, basename(path), files)
    } else if (info.isFile()) {
      files.push({
        path,
        fileName: basename(path),
        size: info.size,
        type: mimeType(path),
      })
    } else {
      throw new UsageError(`"${given}" is not a file or a folder.`)
    }
  }

  if (files.length === 0) throw new UsageError('There are no files to send.')

  const seen = new Set<string>()
  for (const file of files) {
    if (seen.has(file.fileName)) {
      throw new UsageError(
        `Two files would be shared as "${file.fileName}". Send them separately.`,
      )
    }
    seen.add(file.fileName)
  }
  return files
}
