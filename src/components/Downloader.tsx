'use client'

import React, { useState, useCallback } from 'react'
import { useDownloader } from '../hooks/useDownloader'
import PasswordField from './PasswordField'
import UnlockButton from './UnlockButton'
import Loading from './Loading'
import UploadFileList from './UploadFileList'
import DownloadButton from './DownloadButton'
import StopButton from './StopButton'
import ProgressBar from './ProgressBar'
import TitleText from './TitleText'
import ReturnHome from './ReturnHome'
import { pluralize } from '../utils/pluralize'

interface FileInfo {
  fileName: string
  size: number
  type: string
}

export function DownloadComplete({
  filesInfo,
  bytesDownloaded,
  totalSize,
}: {
  filesInfo: FileInfo[]
  bytesDownloaded: number
  totalSize: number
}): JSX.Element {
  return (
    <>
      <TitleText>
        You downloaded {pluralize(filesInfo.length, 'file', 'files')}.
      </TitleText>
      <div className="flex flex-col space-y-5 w-full">
        <UploadFileList files={filesInfo} />
        <div className="w-full">
          <ProgressBar value={bytesDownloaded} max={totalSize} />
        </div>
        <ReturnHome />
      </div>
    </>
  )
}

export function DownloadInProgress({
  filesInfo,
  bytesDownloaded,
  totalSize,
  onStop,
}: {
  filesInfo: FileInfo[]
  bytesDownloaded: number
  totalSize: number
  onStop: () => void
}): JSX.Element {
  return (
    <>
      <TitleText>
        You are downloading {pluralize(filesInfo.length, 'file', 'files')}.
      </TitleText>
      <div className="flex flex-col space-y-5 w-full">
        <UploadFileList files={filesInfo} />
        <div className="w-full">
          <ProgressBar value={bytesDownloaded} max={totalSize} />
        </div>
        <div className="flex justify-center w-full">
          <StopButton onClick={onStop} isDownloading />
        </div>
      </div>
    </>
  )
}

export function ReadyToDownload({
  filesInfo,
  onStart,
}: {
  filesInfo: FileInfo[]
  onStart: () => void
}): JSX.Element {
  return (
    <>
      <TitleText>
        You are about to start downloading{' '}
        {pluralize(filesInfo.length, 'file', 'files')}.
      </TitleText>
      <div className="flex flex-col space-y-5 w-full">
        <UploadFileList files={filesInfo} />
        <DownloadButton onClick={onStart} />
      </div>
    </>
  )
}

export function PasswordEntry({
  onSubmit,
  errorMessage,
}: {
  onSubmit: (password: string) => void
  errorMessage: string | null
}): JSX.Element {
  const [password, setPassword] = useState('')
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      onSubmit(password)
    },
    [onSubmit, password],
  )

  return (
    <>
      <TitleText>This download requires a password.</TitleText>
      <div className="flex flex-col space-y-5 w-full">
        <form
          action="#"
          method="post"
          onSubmit={handleSubmit}
          className="w-full"
        >
          <div className="flex flex-col space-y-5 w-full">
            <PasswordField
              value={password}
              onChange={setPassword}
              isRequired
              isInvalid={Boolean(errorMessage)}
            />
            <UnlockButton />
          </div>
        </form>
      </div>
      {errorMessage && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}
    </>
  )
}

export default function Downloader({
  uploaderPeerID,
}: {
  uploaderPeerID: string
}): JSX.Element {
  const {
    filesInfo,
    isConnected,
    isPasswordRequired,
    isDownloading,
    isDone,
    errorMessage,
    submitPassword,
    startDownload,
    stopDownload,
    totalSize,
    bytesDownloaded,
  } = useDownloader(uploaderPeerID)

  if (isDone && filesInfo) {
    return (
      <DownloadComplete
        filesInfo={filesInfo}
        bytesDownloaded={bytesDownloaded}
        totalSize={totalSize}
      />
    )
  }

  if (!isConnected) {
    return <Loading text="Connecting to uploader..." />
  }

  if (isDownloading && filesInfo) {
    return (
      <DownloadInProgress
        filesInfo={filesInfo}
        bytesDownloaded={bytesDownloaded}
        totalSize={totalSize}
        onStop={stopDownload}
      />
    )
  }

  if (filesInfo) {
    return <ReadyToDownload filesInfo={filesInfo} onStart={startDownload} />
  }

  if (isPasswordRequired) {
    return (
      <PasswordEntry errorMessage={errorMessage} onSubmit={submitPassword} />
    )
  }

  return <Loading text="Uh oh... Something went wrong." />
}
