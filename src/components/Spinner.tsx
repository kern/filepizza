import React from 'react'
import { Box, Center, Img } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'

const rotate = keyframes`
  from { transform: rotate(0deg) }
  to { transform: rotate(360deg) }
`

export default function Spinner({
  direction,
  isRotating,
}: {
  direction: 'up' | 'down'
  isRotating?: boolean
}): JSX.Element {
  const src = `/images/${direction}.png`
  return (
    <Box pos="relative" w="300px" h="300px">
      <Img
        src="/images/pizza.png"
        animation={isRotating ? `${rotate} 5s infinite linear` : 'none'}
      />
      <Center pos="absolute" top="0" left="0" w="100%" h="100%">
        <Img src={src} w="120px" />
      </Center>
    </Box>
  )
}
