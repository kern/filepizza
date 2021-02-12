import React from 'react'
import { Button } from '@chakra-ui/react'

type Props = {
  onClick?: React.MouseEventHandler
}

const DownloadButton: React.FC<Props> = ({ onClick }: Props) => {
  return (
    <Button onClick={onClick} colorScheme="green">
      Download
    </Button>
  )
}

export default DownloadButton
