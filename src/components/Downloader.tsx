import React from 'react'

interface Props {
  uploaderPeerID: string
}

const Downloader: React.FC<Props> = ({ uploaderPeerID }: Props) => {
  // const room = useRef<Room | null>(null)
  // const peerData = usePeerData()

  // useEffect(() => {
  //   if (room.current) return

  //   room.current = peerData.connect(roomName)
  //   console.log(room.current)
  //   setInterval(() => console.log(room.current), 1000)
  //   room.current
  //     .on('participant', (participant) => {
  //       console.log(participant.getId() + ' joined')
  //       participant.newDataChannel()

  //       participant
  //         .on('connected', () => {
  //           console.log('connected', participant.id)
  //         })
  //         .on('disconnected', () => {
  //           console.log('disconnected', participant.id)
  //         })
  //         .on('track', (event) => {
  //           console.log('stream', participant.id, event.streams[0])
  //         })
  //         .on('message', (payload) => {
  //           console.log(participant.id, payload)
  //         })
  //         .on('error', (event) => {
  //           console.error('peer', participant.id, event)
  //           participant.renegotiate()
  //         })

  //       console.log(participant)
  //       participant.send(`hello there, I'm the downloader`)
  //     })
  //     .on('error', (event) => {
  //       console.error('room', roomName, event)
  //     })

  //   return () => {
  //     room.current.disconnect()
  //     room.current = null
  //   }
  // }, [peerData])

  return null
}

export default Downloader
