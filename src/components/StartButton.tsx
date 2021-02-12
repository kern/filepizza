import React from 'react'
import { Button } from '@chakra-ui/react'

type Props = {
  onClick: React.MouseEventHandler
}

const StartButton: React.FC<Props> = ({ onClick }: Props) => {
  return (
    <Button onClick={onClick} colorScheme="green">
      Start
    </Button>
  )
}

export default StartButton
