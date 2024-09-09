'use client'

import React, { useCallback, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WebRTCProvider from '../components/WebRTCProvider'
import DropZone from '../components/DropZone'
import UploadFileList from '../components/UploadFileList'
import Uploader from '../components/Uploader'
import PasswordField from '../components/PasswordField'
import StartButton from '../components/StartButton'
import StopButton from '../components/StopButton'
import { UploadedFile } from '../types'
import Spinner from '../components/Spinner'
import Wordmark from '../components/Wordmark'
import CancelButton from '../components/CancelButton'

const queryClient = new QueryClient()

function PageWrapper({
  children,
  isRotating = false,
}: {
  children: React.ReactNode
  isRotating?: boolean
}): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col items-center space-y-5 py-10 max-w-2xl mx-auto">
        <Spinner direction="up" isRotating={isRotating} />
        <Wordmark />
        {children}
      </div>
    </QueryClientProvider>
  )
}

function InitialState({
  onDrop,
}: {
  onDrop: (files: UploadedFile[]) => void
}): JSX.Element {
  return (
    <PageWrapper>
      <div className="flex flex-col items-center space-y-1 max-w-md">
        <p className="text-lg text-center text-stone-800">
          Peer-to-peer file transfers in your browser.
        </p>
        <p className="text-sm text-center text-stone-600">
          We never store anything. Files only served fresh.
        </p>
      </div>
      <DropZone onDrop={onDrop} />
    </PageWrapper>
  )
}

function ConfirmUploadState({
  uploadedFiles,
  password,
  onChangePassword,
  onCancel,
  onStart,
  onFileListChange,
}: {
  uploadedFiles: UploadedFile[]
  password: string
  onChangePassword: (pw: string) => void
  onCancel: () => void
  onStart: () => void
  onFileListChange: (updatedFiles: UploadedFile[]) => void
}): JSX.Element {
  return (
    <PageWrapper>
      <p className="text-lg text-center text-stone-800 max-w-md">
        You are about to start uploading {uploadedFiles.length}{' '}
        {uploadedFiles.length === 1 ? 'file' : 'files'}.
      </p>
      <UploadFileList files={uploadedFiles} onChange={onFileListChange} />
      <PasswordField value={password} onChange={onChangePassword} />
      <div className="flex space-x-4">
        <CancelButton onClick={onCancel} />
        <StartButton onClick={onStart} />
      </div>
    </PageWrapper>
  )
}

function UploadingState({
  uploadedFiles,
  password,
  onStop,
}: {
  uploadedFiles: UploadedFile[]
  password: string
  onStop: () => void
}): JSX.Element {
  return (
    <PageWrapper isRotating={true}>
      <p className="text-lg text-center text-stone-800 max-w-md">
        You are uploading {uploadedFiles.length}{' '}
        {uploadedFiles.length === 1 ? 'file' : 'files'}.
      </p>
      <UploadFileList files={uploadedFiles} />
      <WebRTCProvider>
        <Uploader files={uploadedFiles} password={password} />
      </WebRTCProvider>
      <StopButton onClick={onStop} />
    </PageWrapper>
  )
}

export default function UploadPage(): JSX.Element {
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
    return <InitialState onDrop={handleDrop} />
  }

  if (!uploading) {
    return (
      <ConfirmUploadState
        uploadedFiles={uploadedFiles}
        password={password}
        onChangePassword={handleChangePassword}
        onCancel={handleCancel}
        onStart={handleStart}
        onFileListChange={handleFileListChange}
      />
    )
  }

  return (
    <UploadingState
      uploadedFiles={uploadedFiles}
      password={password}
      onStop={handleStop}
    />
  )
}
