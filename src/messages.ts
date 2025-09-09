import { z } from 'zod'

export enum MessageType {
  RequestInfo = 'RequestInfo',
  Info = 'Info',
  Start = 'Start',
  Chunk = 'Chunk',
  ChunkAck = 'ChunkAck',
  Pause = 'Pause',
  Done = 'Done',
  Error = 'Error',
  PasswordRequired = 'PasswordRequired',
  UsePassword = 'UsePassword',
  Report = 'Report',
}

export const RequestInfoMessage = z.object({
  type: z.literal(MessageType.RequestInfo),
  browserName: z.string(),
  browserVersion: z.string(),
  osName: z.string(),
  osVersion: z.string(),
  mobileVendor: z.string(),
  mobileModel: z.string(),
})

export const InfoMessage = z.object({
  type: z.literal(MessageType.Info),
  files: z.array(
    z.object({
      fileName: z.string(),
      size: z.number(),
      type: z.string(),
    }),
  ),
})

export const StartMessage = z.object({
  type: z.literal(MessageType.Start),
  fileName: z.string(),
  offset: z.number(),
})

export const ChunkMessage = z.object({
  type: z.literal(MessageType.Chunk),
  fileName: z.string(),
  offset: z.number(),
  bytes: z.unknown(),
  final: z.boolean(),
})

export const ChunkAckMessage = z.object({
  type: z.literal(MessageType.ChunkAck),
  fileName: z.string(),
  offset: z.number(),
  bytesReceived: z.number(),
})

export const DoneMessage = z.object({
  type: z.literal(MessageType.Done),
})

export const ErrorMessage = z.object({
  type: z.literal(MessageType.Error),
  error: z.string(),
})

export const PasswordRequiredMessage = z.object({
  type: z.literal(MessageType.PasswordRequired),
  errorMessage: z.string().optional(),
})

export const UsePasswordMessage = z.object({
  type: z.literal(MessageType.UsePassword),
  password: z.string(),
})

export const PauseMessage = z.object({
  type: z.literal(MessageType.Pause),
})

export const ReportMessage = z.object({
  type: z.literal(MessageType.Report),
})

export const Message = z.discriminatedUnion('type', [
  RequestInfoMessage,
  InfoMessage,
  StartMessage,
  ChunkMessage,
  ChunkAckMessage,
  DoneMessage,
  ErrorMessage,
  PasswordRequiredMessage,
  UsePasswordMessage,
  PauseMessage,
  ReportMessage,
])

export type Message = z.infer<typeof Message>

export function decodeMessage(data: unknown): Message {
  return Message.parse(data)
}
