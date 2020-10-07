import React, { useCallback, useState } from 'react'
import WebRTCProvider from '../components/WebRTCProvider'
import Dropzone from '../components/Dropzone'
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
    console.log('Received files', files)
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
        <Dropzone onDrop={handleDrop}>Drop a file to get started.</Dropzone>
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
      <>
        <UploadFileList files={uploadedFiles} />
        <StopButton onClick={handleStop} />
        <Uploader roomName={'my-room'} files={uploadedFiles} />
      </>
    </WebRTCProvider>
  )
}

IndexPage.getInitialProps = () => {
  return {}
}

export default IndexPage
