import { useState, useCallback, useRef, useEffect } from 'react'
import { useWebRTC } from '../components/WebRTCProvider'
import { z } from 'zod'
import { ChunkMessage, decodeMessage, Message, MessageType } from '../messages'
import { DataConnection } from 'peerjs'
import {
  streamDownloadSingleFile,
  streamDownloadMultipleFiles,
} from '../utils/download'
import {
  browserName,
  browserVersion,
  osName,
  osVersion,
  mobileVendor,
  mobileModel,
} from 'react-device-detect'
const cleanErrorMessage = (errorMessage: string): string =>
  errorMessage.startsWith('Could not connect to peer')
    ? 'Could not connect to the uploader. Did they close their browser?'
    : errorMessage

const getZipFilename = (): string => `filepizza-download-${Date.now()}.zip`

export function useDownloader(uploaderPeerID: string): {
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
  const peer = useWebRTC()
  const [dataConnection, setDataConnection] = useState<DataConnection | null>(
    null,
  )
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
    if (!peer) return
    const conn = peer.connect(uploaderPeerID, { reliable: true })
    setDataConnection(conn)

    const handleOpen = () => {
      setIsConnected(true)
      conn.send({
        type: MessageType.RequestInfo,
        browserName,
        browserVersion,
        osName,
        osVersion,
        mobileVendor,
        mobileModel,
      } as z.infer<typeof Message>)
    }

    const handleData = (data: unknown) => {
      try {
        const message = decodeMessage(data)
        switch (message.type) {
          case MessageType.PasswordRequired:
            setIsPasswordRequired(true)
            if (message.errorMessage) setErrorMessage(message.errorMessage)
            break
          case MessageType.Info:
            setFilesInfo(message.files)
            break
          case MessageType.Chunk:
            processChunk.current?.(message)
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
    }

    const handleClose = () => {
      setDataConnection(null)
      setIsConnected(false)
      setIsDownloading(false)
    }

    const handleError = (err: Error) => {
      console.error(err)
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
      if (conn.open) conn.close()
      conn.off('open', handleOpen)
      conn.off('data', handleData)
      conn.off('error', handleError)
      conn.off('close', handleClose)
      peer.off('error', handleError)
    }
  }, [peer])

  const submitPassword = useCallback(
    (pass: string) => {
      if (!dataConnection) return
      dataConnection.send({
        type: MessageType.UsePassword,
        password: pass,
      } as z.infer<typeof Message>)
    },
    [dataConnection],
  )

  const startDownload = useCallback(() => {
    if (!filesInfo || !dataConnection) return
    setIsDownloading(true)

    const fileStreamByPath: Record<
      string,
      {
        stream: ReadableStream<Uint8Array>
        enqueue: (chunk: Uint8Array) => void
        close: () => void
      }
    > = {}
    const fileStreams = filesInfo.map((info) => {
      let enqueue: ((chunk: Uint8Array) => void) | null = null
      let close: (() => void) | null = null
      const stream = new ReadableStream<Uint8Array>({
        start(ctrl) {
          enqueue = (chunk: Uint8Array) => ctrl.enqueue(chunk)
          close = () => ctrl.close()
        },
      })
      if (!enqueue || !close)
        throw new Error('Failed to initialize stream controllers')
      fileStreamByPath[info.fileName] = { stream, enqueue, close }
      return stream
    })

    let nextFileIndex = 0
    const startNextFileOrFinish = () => {
      if (nextFileIndex >= filesInfo.length) return
      dataConnection.send({
        type: MessageType.Start,
        fileName: filesInfo[nextFileIndex].fileName,
        offset: 0,
      } as z.infer<typeof Message>)
      nextFileIndex++
    }

    processChunk.current = (message: z.infer<typeof ChunkMessage>) => {
      const fileStream = fileStreamByPath[message.fileName]
      if (!fileStream) {
        console.error('no stream found for ' + message.fileName)
        return
      }
      setBytesDownloaded((bd) => bd + (message.bytes as ArrayBuffer).byteLength)
      fileStream.enqueue(new Uint8Array(message.bytes as ArrayBuffer))
      if (message.final) {
        fileStream.close()
        startNextFileOrFinish()
      }
    }

    const downloads = filesInfo.map((info, i) => ({
      name: info.fileName.replace(/^\//, ''),
      size: info.size,
      stream: () => fileStreams[i],
    }))

    const downloadPromise =
      downloads.length > 1
        ? streamDownloadMultipleFiles(downloads, getZipFilename())
        : streamDownloadSingleFile(downloads[0], downloads[0].name)

    downloadPromise
      .then(() => {
        dataConnection.send({ type: MessageType.Done } as z.infer<
          typeof Message
        >)
        setDone(true)
      })
      .catch(console.error)

    startNextFileOrFinish()
  }, [dataConnection, filesInfo])

  const stopDownload = useCallback(() => {
    // TODO(@kern): Continue here with stop / pause logic
    if (dataConnection) {
      dataConnection.send({ type: MessageType.Pause } as z.infer<
        typeof Message
      >)
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
