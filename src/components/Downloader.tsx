import React, { useCallback, useEffect, useRef, useState } from 'react'
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
import { ChunkMessage, decodeMessage, Message, MessageType } from '../messages'
import { createZipStream } from '../zip-stream'
import { DataConnection } from 'peerjs'

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
  const [dataConnection, setDataConnection] = useState<DataConnection | null>(
    null,
  )
  const [filesInfo, setFilesInfo] = useState<Array<{
    fullPath: string
    size: number
    type: string
  }> | null>(null)
  const processChunk = useRef<
    ((message: t.TypeOf<typeof ChunkMessage>) => void) | null
  >(null)
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

    setDataConnection(conn)

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
            setFilesInfo(message.files)
            break

          case MessageType.Chunk:
            if (processChunk.current) processChunk.current(message)
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
      setDataConnection(null)
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

    const fileStreams = filesInfo.map((_info) => {
      return new ReadableStream({
        start(ctrl) {
          console.log('START')
          console.log(ctrl)
        },
        async pull(ctrl) {
          console.log('PULL')
          console.log(ctrl)
        },
      })
    })

    const fileStreamByPath: Record<string, ReadableStream> = {}
    fileStreams.forEach((stream, i) => {
      fileStreamByPath[filesInfo[i].fullPath] = stream
    })

    const processChunkFunc = (message: t.TypeOf<typeof ChunkMessage>): void => {
      const stream = fileStreamByPath[message.fullPath]
      if (!stream) {
        console.error('no stream found for ' + message.fullPath)
        return
      }

      console.log(stream)
    }
    processChunk.current = processChunkFunc

    const downloads = filesInfo.map((info, i) => ({
      name: info.fullPath.replace(/^\//, ''),
      size: info.size,
      stream: () => fileStreams[i],
    }))

    let downloadPromise: Promise<void> | null = null
    if (downloads.length > 1) {
      downloadPromise = streamDownloadMultipleFiles(downloads)
    } else if (downloads.length === 1) {
      downloadPromise = streamDownloadSingleFile(downloads[0])
    } else {
      throw new Error('no files to download')
    }

    downloadPromise
      .then(() => {
        console.log('DONE')
      })
      .catch((err) => {
        console.error(err)
      })

    const request: t.TypeOf<typeof Message> = {
      type: MessageType.Start,
      fullPath: filesInfo[0].fullPath,
      offset: 0,
    }
    dataConnection.send(request)
  }, [dataConnection, filesInfo])

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
