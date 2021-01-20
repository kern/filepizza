import React, { useCallback, useEffect, useState } from 'react'
import { useWebRTC } from './WebRTCProvider'
import {
  browserName,
  browserVersion,
  osName,
  osVersion,
  mobileVendor,
  mobileModel,
} from 'react-device-detect'
import * as t from 'io-ts'
import { decodeMessage, Message, MessageType } from '../messages'
import { createZipStream } from '../zip-stream'

const baseURL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

// eslint-disable-next-line @typescript-eslint/no-var-requires
if (process.browser) require('web-streams-polyfill/ponyfill')

// eslint-disable-next-line @typescript-eslint/no-var-requires
const streamSaver = process.browser ? require('streamsaver') : null
if (process.browser) {
  streamSaver.mitm = baseURL + '/stream.html'
}

function getZipFilename(): string {
  return `filepizza-download-${Date.now()}.zip`
}

type DownloadFileStream = {
  name: string
  size: number
  stream: () => ReadableStream
}

export async function streamDownloadSingleFile(
  file: DownloadFileStream,
): Promise<void> {
  const fileStream = streamSaver.createWriteStream(file.name, {
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
): Promise<void> {
  const filename = getZipFilename()
  const totalSize = files.reduce((acc, file) => acc + file.size, 0)
  const fileStream = streamSaver.createWriteStream(filename, {
    size: totalSize,
  })

  const readableZipStream = createZipStream({
    start(ctrl) {
      for (const file of files) {
        ctrl.enqueue(file)
      }
      ctrl.close()
    },
    async pull(_ctrl) {
      // Gets executed everytime zip-stream asks for more data
    },
  })

  return readableZipStream.pipeTo(fileStream)
}

export default function Downloader({
  uploaderPeerID,
}: {
  uploaderPeerID: string
}): JSX.Element {
  const peer = useWebRTC()

  const [password, setPassword] = useState('')
  const [shouldAttemptConnection, setShouldAttemptConnection] = useState(false)
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!shouldAttemptConnection) {
      return
    }

    const conn = peer.connect(uploaderPeerID, {
      reliable: true,
    })

    conn.on('open', () => {
      setOpen(true)

      const request: t.TypeOf<typeof Message> = {
        type: MessageType.RequestInfo,
        browserName: browserName,
        browserVersion: browserVersion,
        osName: osName,
        osVersion: osVersion,
        mobileVendor: mobileVendor,
        mobileModel: mobileModel,
        password,
      }

      conn.send(request)
    })

    conn.on('data', (data) => {
      try {
        const message = decodeMessage(data)
        switch (message.type) {
          case MessageType.Info:
            console.log(message)
            break

          case MessageType.Error:
            console.error(message.error)
            setErrorMessage(message.error)
            conn.close()
            break
        }
      } catch (err) {
        console.error(err)
      }
    })

    conn.on('close', () => {
      setOpen(false)
      setDownloading(false)
      setShouldAttemptConnection(false)
    })

    return () => {
      if (conn.open) conn.close()
    }
  }, [peer, password, shouldAttemptConnection])

  const handleChangePassword = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value)
    },
    [],
  )

  const handleSubmitPassword = useCallback((ev) => {
    ev.preventDefault()
    setShouldAttemptConnection(true)
  }, [])

  const handleStartDownload = useCallback(() => {
    setDownloading(true)

    // TODO(@kern): Download each file as a ReadableStream
    // const blob = new Blob(['support blobs too'])
    // const file = {
    //   name: 'blob-example.txt',
    //   size: 12,
    //   stream: () => blob.stream(),
    // }
    // streamDownloadSingleFile(file)
    // streamDownloadMultipleFiles([file])
  }, [])

  if (downloading) {
    return <div>Downloading</div>
  }

  if (open) {
    return (
      <div>
        <button onClick={handleStartDownload}>Download</button>
      </div>
    )
  }

  if (shouldAttemptConnection) {
    return <div>Loading...</div>
  }

  return (
    <form action="#" method="post" onSubmit={handleSubmitPassword}>
      {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
      <input type="password" value={password} onChange={handleChangePassword} />
      <button>Unlock</button>
    </form>
  )
}
