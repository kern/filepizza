import React from 'react'
import { Box, Text, Badge, HStack, VStack } from '@chakra-ui/react'

type UploadedFileLike = {
  fullPath: string
  type: string
}

interface Props {
  files: UploadedFileLike[]
}

const UploadFileList: React.FC<Props> = ({ files }: Props) => {
  const items = files.map((f: UploadedFileLike, i: number) => (
    <Box key={f.fullPath} w="100%">
      <HStack
        justify="space-between"
        paddingY="8px"
        paddingX="10px"
        borderTopColor="gray.100"
        borderTopWidth={i === 0 ? '0' : '1px'}
      >
        <Text textStyle="fileName" isTruncated>
          {f.fullPath.slice(1)}
        </Text>
        <Badge size="sm">{f.type}</Badge>
      </HStack>
    </Box>
  ))

  return (
    <VStack w="100%" spacing="0" borderRadius="md" boxShadow="base">
      {items}
    </VStack>
  )
}

export default UploadFileList
