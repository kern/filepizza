import React from 'react'
import { Button } from '@chakra-ui/react'

type Props = {
  onClick: React.MouseEventHandler
  isDownloading?: boolean
}

const StopButton: React.FC<Props> = ({ isDownloading, onClick }: Props) => {
  return (
    <Button size="xs" colorScheme="orange" variant="ghost" onClick={onClick}>
      {isDownloading ? 'Stop Download' : 'Stop Upload'}
    </Button>
  )
}

export default StopButton
