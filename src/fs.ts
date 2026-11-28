import { UploadedFile } from './types'

const getAsFile = (entry: FileSystemFileEntry): Promise<File> =>
  new Promise((resolve, reject) => {
    entry.file((file) => {
      const uploaded: UploadedFile = file
      uploaded.entryFullPath = entry.fullPath
      resolve(uploaded)
    }, reject)
  })

const readDirectoryEntries = (
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> =>
  new Promise((resolve, reject) => {
    reader.readEntries((entries) => {
      resolve(entries)
    }, reject)
  })

const scanDirectoryEntry = async (
  entry: FileSystemDirectoryEntry,
): Promise<File[]> => {
  const directoryReader = entry.createReader()
  const result: File[] = []
  // oxlint-disable-next-line no-constant-condition
  while (true) {
    const subentries = await readDirectoryEntries(directoryReader)
    if (!subentries.length) {
      return result
    }

    for (const se of subentries) {
      if (se.isDirectory) {
        const ses = await scanDirectoryEntry(se as FileSystemDirectoryEntry)
        result.push(...ses)
      } else {
        const file = await getAsFile(se as FileSystemFileEntry)
        result.push(file)
      }
    }
  }
}

export const extractFileList = async (
  e: React.DragEvent | DragEvent,
): Promise<File[]> => {
  if (!e.dataTransfer || !e.dataTransfer.items.length) {
    return []
  }

  const items = e.dataTransfer.items
  const scans: Promise<File[]>[] = []
  const files: Promise<File>[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const entry = item.webkitGetAsEntry()
    if (entry) {
      if (entry.isDirectory) {
        scans.push(scanDirectoryEntry(entry as FileSystemDirectoryEntry))
      } else {
        files.push(getAsFile(entry as FileSystemFileEntry))
      }
    }
  }

  const scanResults = await Promise.all(scans)
  const fileResults = await Promise.all(files)

  return scanResults.flat().concat(fileResults)
}

// Borrowed from StackOverflow
// http://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
export const formatSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes'
  }
  const k = 1000
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toPrecision(3)} ${sizes[i]}`
}

export const getFileName = (file: UploadedFile): string => {
  return file.name || file.entryFullPath || ''
}
