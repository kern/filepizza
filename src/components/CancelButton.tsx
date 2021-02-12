import React from 'react'
import { Button } from '@chakra-ui/react'

type Props = {
  onClick: React.MouseEventHandler
}

const CancelButton: React.FC<Props> = ({ onClick }: Props) => {
  return (
    <Button onClick={onClick} variant="outline">
      Cancel
    </Button>
  )
}

export default CancelButton
