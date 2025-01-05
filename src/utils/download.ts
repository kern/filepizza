import { createZipStream } from '../zip-stream'

// eslint-disable-next-line @typescript-eslint/no-require-imports
if (typeof window !== 'undefined') require('web-streams-polyfill/polyfill')

const streamSaver =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  typeof window !== 'undefined' ? require('streamsaver') : null
if (typeof window !== 'undefined') {
  streamSaver.mitm = `${window.location.protocol}//${window.location.host}/stream.html`
}

type DownloadFileStream = {
  name: string
  size: number
  stream: () => ReadableStream<Uint8Array>
}

export async function streamDownloadSingleFile(
  file: DownloadFileStream,
  filename: string,
): Promise<void> {
  const fileStream = streamSaver.createWriteStream(filename, {
    size: file.size,
  })

  const writer = fileStream.getWriter()
  const reader = file.stream().getReader()

  const pump = async () => {
    const res = await reader.read()
    return res.done ? writer.close() : writer.write(res.value).then(pump)
  }
  await pump()
}

export function streamDownloadMultipleFiles(
  files: Array<DownloadFileStream>,
  filename: string,
): Promise<void> {
  const totalSize = files.reduce((acc, file) => acc + file.size, 0)
  const fileStream = streamSaver.createWriteStream(filename, {
    size: totalSize,
  })

  const readableZipStream = createZipStream({
    start(ctrl) {
      for (const file of files) {
        ctrl.enqueue(file as unknown as ArrayBufferView)
      }
      ctrl.close()
    },
    async pull(_ctrl) {
      // Gets executed everytime zip-stream asks for more data
    },
  })

  return readableZipStream.pipeTo(fileStream)
}
