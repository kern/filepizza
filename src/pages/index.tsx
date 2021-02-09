import React, { useCallback, useState } from 'react'
import WebRTCProvider from '../components/WebRTCProvider'
import DropZone from '../components/DropZone'
import UploadFileList from '../components/UploadFileList'
import Uploader from '../components/Uploader'
import PasswordField from '../components/PasswordField'
import StartButton from '../components/StartButton'
import StopButton from '../components/StopButton'
import { UploadedFile } from '../types'
import { NextPage } from 'next'
import Spinner from '../components/Spinner'
import { ButtonGroup, Text, VStack } from '@chakra-ui/react'
import Wordmark from '../components/Wordmark'
import CancelButton from '../components/CancelButton'

export const IndexPage: NextPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [password, setPassword] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleDrop = useCallback((files: UploadedFile[]): void => {
    setUploadedFiles(files)
  }, [])

  const handleChangePassword = useCallback((pw: string) => {
    setPassword(pw)
  }, [])

  const handleStart = useCallback(() => {
    setUploading(true)
  }, [])

  const handleStop = useCallback(() => {
    setUploading(false)
  }, [])

  const handleCancel = useCallback(() => {
    setUploadedFiles([])
    setUploading(false)
  }, [])

  if (!uploadedFiles.length) {
    return (
      <VStack spacing="20px" paddingY="40px">
        <Spinner direction="up" />
        <Wordmark />
        <VStack spacing="4px">
          <Text textStyle="description">
            Peer-to-peer file transfers in your browser.
          </Text>
          <Text textStyle="descriptionSmall">
            We never store anything. Files only served fresh.
          </Text>
        </VStack>
        <DropZone onDrop={handleDrop}>Drop a file to get started.</DropZone>
      </VStack>
    )
  }

  if (!uploading) {
    return (
      <VStack spacing="20px" paddingY="40px">
        <Spinner direction="up" />
        <Wordmark />
        <Text textStyle="description">
          You are about to start uploading {uploadedFiles.length} files.
        </Text>
        <UploadFileList files={uploadedFiles} />
        <PasswordField value={password} onChange={handleChangePassword} />
        <ButtonGroup>
          <CancelButton onClick={handleCancel} />
          <StartButton onClick={handleStart} />
        </ButtonGroup>
      </VStack>
    )
  }

  return (
    <VStack spacing="20px" paddingY="40px">
      <Spinner direction="up" isRotating />
      <Wordmark />
      <Text textStyle="description">
        You are uploading {uploadedFiles.length} files.
      </Text>
      <UploadFileList files={uploadedFiles} />
      <WebRTCProvider>
        <Uploader files={uploadedFiles} password={password} />
      </WebRTCProvider>
      <StopButton onClick={handleStop} />
    </VStack>
  )
}

IndexPage.getInitialProps = () => {
  return {}
}

export default IndexPage
