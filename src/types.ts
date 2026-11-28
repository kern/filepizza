import type { Message } from './messages'

export type UploadedFile = File & { entryFullPath?: string }

export enum UploaderConnectionStatus {
  Pending = 'PENDING',
  Ready = 'READY',
  Paused = 'PAUSED',
  Uploading = 'UPLOADING',
  Done = 'DONE',
  Authenticating = 'AUTHENTICATING',
  InvalidPassword = 'INVALID_PASSWORD',
  Closed = 'CLOSED',
}

export interface UploaderTransport {
  readonly peer: string
  readonly open: boolean
  readonly metadata?: { type?: string }
  readonly peerConnection?: RTCPeerConnection
  send(message: Message): void
  close(): void
  on(event: 'data', listener: (data: unknown) => void): void
  on(event: 'close', listener: () => void): void
  off(event: 'data', listener: (data: unknown) => void): void
  off(event: 'close', listener: () => void): void
}

export type UploaderConnection = {
  status: UploaderConnectionStatus
  dataConnection: UploaderTransport
  browserName?: string
  browserVersion?: string
  osName?: string
  osVersion?: string
  mobileVendor?: string
  mobileModel?: string
  uploadingFileName?: string
  uploadingOffset?: number
  acknowledgedBytes?: number
  completedFiles: number
  totalFiles: number
  currentFileProgress: number
}
