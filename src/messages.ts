import * as t from 'io-ts'
import { pipe } from 'fp-ts/function'
import { fold } from 'fp-ts/Either'

export enum MessageType {
  RequestInfo = 'REQUEST_INFO',
  Info = 'INFO',
  Pause = 'PAUSE',
  Start = 'START',
  Chunk = 'CHUNK',
  Done = 'DONE',
  Error = 'ERROR',
}

export const RequestInfoMessage = t.type({
  type: t.literal(MessageType.RequestInfo),
  browserName: t.string,
  browserVersion: t.string,
  osName: t.string,
  osVersion: t.string,
  mobileVendor: t.string,
  mobileModel: t.string,
  password: t.string,
})

export const InfoMessage = t.type({
  type: t.literal(MessageType.Info),
  files: t.array(
    t.type({
      fullPath: t.string,
      size: t.number,
      type: t.string,
    }),
  ),
})

export const StartMessage = t.type({
  type: t.literal(MessageType.Start),
  fullPath: t.string,
  offset: t.number,
})

export const ChunkMessage = t.type({
  type: t.literal(MessageType.Chunk),
  fullPath: t.string,
  offset: t.number,
  bytes: t.unknown,
  final: t.boolean,
})

export const PauseMessage = t.type({
  type: t.literal(MessageType.Pause),
})

export const DoneMessage = t.type({
  type: t.literal(MessageType.Done),
})

export const ErrorMessage = t.type({
  type: t.literal(MessageType.Error),
  error: t.string,
})

export const Message = t.union([
  RequestInfoMessage,
  InfoMessage,
  PauseMessage,
  StartMessage,
  ChunkMessage,
  DoneMessage,
  ErrorMessage,
])

export function decodeMessage(data: any): t.TypeOf<typeof Message> {
  const onFailure = (errors: t.Errors): t.TypeOf<typeof Message> => {
    throw new Error(`${errors.length} error(s) found`)
  }

  const onSuccess = (mesg: t.TypeOf<typeof Message>) => mesg

  return pipe(Message.decode(data), fold(onFailure, onSuccess))
}
