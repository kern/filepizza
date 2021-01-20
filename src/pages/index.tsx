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

  if (!uploadedFiles.length) {
    return (
      <>
        <DropZone onDrop={handleDrop}>Drop a file to get started.</DropZone>
      </>
    )
  }

  if (!uploading) {
    return (
      <>
        <UploadFileList files={uploadedFiles} />
        <PasswordField value={password} onChange={handleChangePassword} />
        <StartButton onClick={handleStart} />
      </>
    )
  }

  return (
    <WebRTCProvider>
      <UploadFileList files={uploadedFiles} />
      <StopButton onClick={handleStop} />
      <Uploader files={uploadedFiles} password={password} />
    </WebRTCProvider>
  )
}

IndexPage.getInitialProps = () => {
  return {}
}

export default IndexPage
