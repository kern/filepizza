const getAsFile = (entry: any): Promise<File> =>
  new Promise((resolve, reject) => {
    entry.file((file: File) => {
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
