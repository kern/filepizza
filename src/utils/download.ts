import { createZipStream } from '../zip-stream'
import { createWriteStream } from './stream-saver'

type DownloadFileStream = {
  name: string
  size: number
  stream: () => ReadableStream<Uint8Array>
}

type OpenDestination = (
  name: string,
  options: { size: number },
) => WritableStream<Uint8Array>

export async function streamDownloadSingleFile(
  file: DownloadFileStream,
  filename: string,
  openDestination: OpenDestination = createWriteStream,
): Promise<void> {
  const fileStream = openDestination(filename, {
    size: file.size,
  })

  const writer = fileStream.getWriter()
  const reader = file.stream().getReader()

  const pump = async () => {
    const res = await reader.read()
    return res.done ? writer.close() : writer.write(res.value).then(pump)
  }
  try {
    await pump()
  } catch (error) {
    await writer.abort(error)
    throw error
  }
}

export function streamDownloadMultipleFiles(
  files: Array<DownloadFileStream>,
  filename: string,
  openDestination: OpenDestination = createWriteStream,
): Promise<void> {
  const totalSize = files.reduce((acc, file) => acc + file.size, 0)
  const fileStream = openDestination(filename, {
    size: totalSize,
  })

  const readableZipStream = createZipStream({
    start(ctrl) {
      for (const file of files) {
        ctrl.enqueue(file as unknown as ArrayBufferView)
      }
      ctrl.close()
    },
  })

  return readableZipStream.pipeTo(fileStream)
}
