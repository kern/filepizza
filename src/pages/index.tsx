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

  const handleFileListChange = useCallback((updatedFiles: UploadedFile[]) => {
    setUploadedFiles(updatedFiles)
  }, [])

  if (!uploadedFiles.length) {
    return (
      <div className="flex flex-col items-center space-y-5 py-10">
        <Spinner direction="up" />
        <Wordmark />
        <div className="flex flex-col items-center space-y-1">
          <p className="text-lg text-center text-stone-800">
            Peer-to-peer file transfers in your browser.
          </p>
          <p className="text-sm text-center text-stone-600">
            We never store anything. Files only served fresh.
          </p>
        </div>
        <DropZone onDrop={handleDrop} />
      </div>
    )
  }

  if (!uploading) {
    return (
      <div className="flex flex-col items-center space-y-5 py-10">
        <Spinner direction="up" />
        <Wordmark />
        <p className="text-lg text-center text-stone-800">
          You are about to start uploading {uploadedFiles.length} files.
        </p>
        <UploadFileList files={uploadedFiles} onChange={handleFileListChange} />
        <PasswordField value={password} onChange={handleChangePassword} />
        <div className="flex space-x-4">
          <CancelButton onClick={handleCancel} />
          <StartButton onClick={handleStart} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-5 py-10">
      <Spinner direction="up" isRotating />
      <Wordmark />
      <p className="text-lg text-center text-stone-800">
        You are uploading {uploadedFiles.length} files.
      </p>
      <UploadFileList files={uploadedFiles} />
      <WebRTCProvider>
        <Uploader files={uploadedFiles} password={password} />
      </WebRTCProvider>
      <StopButton onClick={handleStop} />
    </div>
  )
}

IndexPage.getInitialProps = () => {
  return {}
}

export default IndexPage
