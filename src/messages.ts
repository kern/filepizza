import * as t from 'io-ts'
import { pipe } from 'fp-ts/function'
import { fold } from 'fp-ts/Either'

export enum MessageType {
  RequestInfo = 'REQUEST_INFO',
  Info = 'INFO',
  Start = 'START',
  Chunk = 'CHUNK',
  Pause = 'PAUSE',
  Error = 'ERROR',
}

const RequestInfoMessage = t.type({
  type: t.literal(MessageType.RequestInfo),
  browserName: t.string,
  browserVersion: t.string,
  osName: t.string,
  osVersion: t.string,
  mobileVendor: t.string,
  mobileModel: t.string,
  password: t.string,
})

const InfoMessage = t.type({
  type: t.literal(MessageType.Info),
  files: t.array(
    t.type({
      fullPath: t.string,
    }),
  ),
})

const StartMessage = t.type({
  type: t.literal(MessageType.Start),
  browserName: t.string,
  browserVersion: t.string,
  osName: t.string,
  osVersion: t.string,
  mobileVendor: t.string,
  mobileModel: t.string,
  password: t.string,
})

const ChunkMessage = t.type({
  type: t.literal(MessageType.Chunk),
  // TODO(@kern): Chunk
})

const PauseMessage = t.type({
  type: t.literal(MessageType.Pause),
  // TODO(@kern): Pausing
})

const ErrorMessage = t.type({
  type: t.literal(MessageType.Error),
  error: t.string,
})

export const Message = t.union([
  RequestInfoMessage,
  InfoMessage,
  StartMessage,
  ChunkMessage,
  PauseMessage,
  ErrorMessage,
])

export function decodeMessage(data: any): t.TypeOf<typeof Message> {
  const onFailure = (errors: t.Errors): t.TypeOf<typeof Message> => {
    throw new Error(`${errors.length} error(s) found`)
  }

  const onSuccess = (mesg: t.TypeOf<typeof Message>) => mesg

  return pipe(Message.decode(data), fold(onFailure, onSuccess))
}
