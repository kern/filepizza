import { z } from 'zod'

export enum MessageType {
  RequestInfo = 'RequestInfo',
  Info = 'Info',
  Start = 'Start',
  Chunk = 'Chunk',
  Done = 'Done',
  Error = 'Error',
}

export const RequestInfoMessage = z.object({
  type: z.literal(MessageType.RequestInfo),
  browserName: z.string(),
  browserVersion: z.string(),
  osName: z.string(),
  osVersion: z.string(),
  mobileVendor: z.string(),
  mobileModel: z.string(),
  password: z.string(),
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

export const DoneMessage = z.object({
  type: z.literal(MessageType.Done),
})

export const ErrorMessage = z.object({
  type: z.literal(MessageType.Error),
  error: z.string(),
})

export const Message = z.discriminatedUnion('type', [
  RequestInfoMessage,
  InfoMessage,
  StartMessage,
  ChunkMessage,
  DoneMessage,
  ErrorMessage,
])

export type Message = z.infer<typeof Message>

export function decodeMessage(data: unknown): Message {
  return Message.parse(data)
}
