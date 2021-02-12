import React from 'react'
import { Spinner, Text, VStack } from '@chakra-ui/react'

export default function Loading({ text }: { text: string }): JSX.Element {
  return (
    <VStack>
      <Spinner color="blue.500" />
      <Text textStyle="descriptionSmall">{text}</Text>
    </VStack>
  )
}
