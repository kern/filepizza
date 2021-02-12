import React from 'react'
import { Button } from '@chakra-ui/react'

type Props = {
  onClick?: React.MouseEventHandler
}

const UnlockButton: React.FC<Props> = ({ onClick }: Props) => {
  return (
    <Button onClick={onClick} colorScheme="green">
      Unlock
    </Button>
  )
}

export default UnlockButton
