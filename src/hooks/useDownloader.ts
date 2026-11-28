import { useState, useCallback, useRef, useEffect } from 'react'
import {
  useWebRTCPeer,
  type DownloadTransport,
} from '../components/WebRTCProvider'
import { z } from 'zod'
import { ChunkMessage, decodeMessage, Message, MessageType } from '../messages'
import {
  streamDownloadSingleFile,
  streamDownloadMultipleFiles,
} from '../utils/download'
import { OrderedChunkWriter, toUint8Array } from '../utils/ordered-chunks'
import { getDeviceInfo } from '../utils/device-info'
import { setRotating } from './useRotatingSpinner'
const cleanErrorMessage = (errorMessage: string): string =>
  errorMessage.startsWith('Could not connect to peer')
    ? 'Could not connect to the uploader. Did they close their browser?'
    : errorMessage

const getZipFilename = (): string => `filepizza-download-${Date.now()}.zip`

export function useDownloader(
  uploaderPeerID: string,
  {
    downloadSingle = streamDownloadSingleFile,
    downloadMultiple = streamDownloadMultipleFiles,
    location = globalThis.location,
  }: {
    downloadSingle?: typeof streamDownloadSingleFile
    downloadMultiple?: typeof streamDownloadMultipleFiles
    location?: Pick<Location, 'href'>
  } = {},
): {
  filesInfo: Array<{ fileName: string; size: number; type: string }> | null
  isConnected: boolean
  isPasswordRequired: boolean
  isDownloading: boolean
  isDone: boolean
  errorMessage: string | null
  submitPassword: (password: string) => void
  startDownload: () => void
  stopDownload: () => void
  totalSize: number
  bytesDownloaded: number
} {
  const { peer } = useWebRTCPeer()
  const [dataConnection, setDataConnection] =
    useState<DownloadTransport | null>(null)
  const [filesInfo, setFilesInfo] = useState<Array<{
    fileName: string
    size: number
    type: string
  }> | null>(null)
  const processChunk = useRef<
    ((message: z.infer<typeof ChunkMessage>) => void) | null
  >(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isPasswordRequired, setIsPasswordRequired] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDone, setDone] = useState(false)
  const [bytesDownloaded, setBytesDownloaded] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    console.log('[Downloader] connecting to uploader', uploaderPeerID)
    const conn = peer.connect(uploaderPeerID, { reliable: true })
    setDataConnection(conn)

    const handleOpen = () => {
      console.log('[Downloader] connection opened')
      setIsConnected(true)
      conn.send({
        type: MessageType.RequestInfo,
        ...getDeviceInfo(navigator.userAgent),
      } as z.infer<typeof Message>)
    }

    const handleData = (data: unknown) => {
      try {
        const message = decodeMessage(data)
        console.log('[Downloader] received message', message.type)
        switch (message.type) {
          case MessageType.PasswordRequired:
            setIsPasswordRequired(true)
            if (message.errorMessage) setErrorMessage(message.errorMessage)
            break
          case MessageType.Info:
            setFilesInfo(message.files)
            setIsPasswordRequired(false)
            setErrorMessage(null)
            break
          case MessageType.Chunk:
            processChunk.current?.(message)
            setRotating(true)
            break
          case MessageType.Error:
            console.error('[Downloader] received error message:', message.error)
            setErrorMessage(message.error)
            conn.close()
            break
          case MessageType.Report:
            console.log('[Downloader] received report message, redirecting')
            location.href = '/reported'
            break
        }
      } catch (err) {
        console.error('[Downloader] error handling message:', err)
      }
    }

    const handleClose = () => {
      console.log('[Downloader] connection closed')
      setRotating(false)
      setDataConnection(null)
      setIsConnected(false)
      setIsDownloading(false)
    }

    const handleError = (err: Error) => {
      console.error('[Downloader] connection error:', err)
      setErrorMessage(cleanErrorMessage(err.message))
      if (conn.open) conn.close()
      else handleClose()
    }

    conn.on('open', handleOpen)
    conn.on('data', handleData)
    conn.on('error', handleError)
    conn.on('close', handleClose)
    peer.on('error', handleError)

    return () => {
      console.log('[Downloader] cleaning up connection')
      if (conn.open) {
        conn.close()
      } else {
        conn.once('open', () => {
          conn.close()
        })
      }

      conn.off('open', handleOpen)
      conn.off('data', handleData)
      conn.off('error', handleError)
      conn.off('close', handleClose)
      peer.off('error', handleError)
    }
  }, [peer, uploaderPeerID, location])

  const submitPassword = useCallback(
    (pass: string) => {
      if (!dataConnection) return
      console.log('[Downloader] submitting password')
      dataConnection.send({
        type: MessageType.UsePassword,
        password: pass,
      } as z.infer<typeof Message>)
    },
    [dataConnection],
  )

  const startDownload = useCallback(() => {
    if (!filesInfo?.length || !dataConnection) return
    console.log('[Downloader] starting download')
    setIsDownloading(true)

    const chunkCountByFile: Record<string, number> = {}
    let nextFileIndex = 0
    const startNextFileOrFinish = () => {
      if (nextFileIndex >= filesInfo.length) return
      console.log(
        '[Downloader] starting next file:',
        filesInfo[nextFileIndex].fileName,
      )
      dataConnection.send({
        type: MessageType.Start,
        fileName: filesInfo[nextFileIndex].fileName,
        offset: 0,
      } as z.infer<typeof Message>)
      nextFileIndex++
    }

    const chunkWriterByFile = new Map<string, OrderedChunkWriter>()
    const fileStreams = filesInfo.map((info) => {
      let controller!: ReadableStreamDefaultController<Uint8Array>
      const stream = new ReadableStream<Uint8Array>({
        start(ctrl) {
          controller = ctrl
        },
      })
      const chunkWriter = new OrderedChunkWriter(
        info.size,
        // Acknowledge here rather than on arrival: the uploader only accepts
        // acks in offset order.
        (chunk, offset) => {
          controller.enqueue(chunk)
          setBytesDownloaded((bd) => bd + chunk.byteLength)
          const ackMessage: Message = {
            type: MessageType.ChunkAck,
            fileName: info.fileName,
            offset,
            bytesReceived: chunk.byteLength,
          }
          dataConnection.send(ackMessage)
          console.log(
            `[Downloader] sent ack for ${info.fileName} (${offset}, ${chunk.byteLength} bytes)`,
          )
        },
        () => {
          console.log(
            `[Downloader] finished receiving ${info.fileName} after ${chunkCountByFile[info.fileName]} chunks`,
          )
          controller.close()
          startNextFileOrFinish()
        },
      )
      chunkWriterByFile.set(info.fileName, chunkWriter)
      return { stream, controller }
    })

    processChunk.current = (message: z.infer<typeof ChunkMessage>) => {
      const chunkWriter = chunkWriterByFile.get(message.fileName)
      if (!chunkWriter) {
        console.error('[Downloader] no stream found for', message.fileName)
        return
      }

      // Track chunks for e2e testing
      if (!chunkCountByFile[message.fileName]) {
        chunkCountByFile[message.fileName] = 0
      }
      chunkCountByFile[message.fileName]++

      try {
        const bytes = toUint8Array(message.bytes)
        console.log(
          `[Downloader] received chunk ${chunkCountByFile[message.fileName]} for ${message.fileName} (${message.offset}-${message.offset + bytes.byteLength}) final=${message.final}`,
        )
        chunkWriter.push(message.offset, bytes, message.final)
      } catch (error) {
        processChunk.current = null
        for (const { controller } of fileStreams) {
          controller.error(error)
        }
      }
    }

    const downloads = filesInfo.map((info, i) => ({
      name: info.fileName.replace(/^\//, ''),
      size: info.size,
      stream: () => fileStreams[i].stream,
    }))

    const downloadPromise =
      downloads.length > 1
        ? downloadMultiple(downloads, getZipFilename())
        : downloadSingle(downloads[0], downloads[0].name)

    downloadPromise
      .then(() => {
        console.log('[Downloader] all files downloaded')
        processChunk.current = null
        dataConnection.send({ type: MessageType.Done } as z.infer<
          typeof Message
        >)
        setDone(true)
      })
      .catch((error) => {
        console.error('[Downloader] download error:', error)
        processChunk.current = null
        setErrorMessage('The download could not be completed.')
        dataConnection.close()
      })

    startNextFileOrFinish()
  }, [dataConnection, filesInfo, downloadSingle, downloadMultiple])

  const stopDownload = useCallback(() => {
    // TODO(@kern): Continue here with stop / pause logic
    if (dataConnection) {
      console.log('[Downloader] pausing download')
      dataConnection.send({ type: MessageType.Pause })
      dataConnection.close()
    }
    setIsDownloading(false)
    setDone(false)
    setBytesDownloaded(0)
    setErrorMessage(null)
    // fileStreams.forEach((stream) => stream.cancel())
    // fileStreams.length = 0
    // Object.values(fileStreamByPath).forEach((stream) => stream.cancel())
    // Object.keys(fileStreamByPath).forEach((key) => delete fileStreamByPath[key])
    //   }, [dataConnection, fileStreams, fileStreamByPath])
  }, [dataConnection])

  return {
    filesInfo,
    isConnected,
    isPasswordRequired,
    isDownloading,
    isDone,
    errorMessage,
    submitPassword,
    startDownload,
    stopDownload,
    totalSize: filesInfo?.reduce((acc, info) => acc + info.size, 0) ?? 0,
    bytesDownloaded,
  }
}
