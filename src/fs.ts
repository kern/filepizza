import { UploadedFile } from './types'

const getAsFile = (entry: any): Promise<File> =>
  new Promise((resolve, reject) => {
    entry.file((file: UploadedFile) => {
      file.fullPath = entry.fullPath
      resolve(file)
    }, reject)
  })

const readDirectoryEntries = (reader: any): Promise<any[]> =>
  new Promise((resolve, reject) => {
    reader.readEntries((entries) => {
      resolve(entries)
    }, reject)
  })

const scanDirectoryEntry = async (entry: any): Promise<File[]> => {
  const directoryReader = entry.createReader()
  const result = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const subentries = await readDirectoryEntries(directoryReader)
    if (!subentries.length) {
      return result
    }

    for (const se of subentries) {
      if (se.isDirectory) {
        const ses = await scanDirectoryEntry(se)
        result.push(...ses)
      } else {
        const file = await getAsFile(se)
        result.push(file)
      }
    }
  }
}

export const extractFileList = async (e: React.DragEvent): Promise<File[]> => {
  if (!e.dataTransfer.items.length) {
    return []
  }

  const items = e.dataTransfer.items
  const scans = []
  const files = []

  for (const item of items) {
    const entry = item.webkitGetAsEntry()
    if (entry.isDirectory) {
      scans.push(scanDirectoryEntry(entry))
    } else {
      files.push(getAsFile(entry))
    }
  }

  const scanResults = await Promise.all(scans)
  const fileResults = await Promise.all(files)

  return [scanResults, fileResults].flat(2)
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
