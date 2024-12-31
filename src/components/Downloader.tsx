'use client'

import React, { JSX, useState, useCallback, useEffect } from 'react'
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
import { ErrorMessage } from './ErrorMessage'

interface FileInfo {
  fileName: string
  size: number
  type: string
}

export function ConnectingToUploader({
  showTroubleshootingAfter = 3000,
}: {
  showTroubleshootingAfter?: number
}): JSX.Element {
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTroubleshooting(true)
    }, showTroubleshootingAfter)
    return () => clearTimeout(timer)
  }, [showTroubleshootingAfter])

  if (!showTroubleshooting) {
    return <Loading text="Connecting to uploader..." />
  }

  return (
    <>
      <Loading text="Connecting to uploader..." />

      <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-8 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-50">
          Having trouble connecting?
        </h2>

        <div className="space-y-4 text-stone-700 dark:text-stone-300">
          <p>
            FilePizza uses direct peer-to-peer connections, but sometimes the
            connection can get stuck. Here are some possible reasons this can
            happen:
          </p>

          <ul className="list-none space-y-3">
            <li className="flex items-start gap-3 px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800">
              <span className="text-base">🚪</span>
              <span className="text-sm">
                The uploader may have closed their browser, lost connectivity,
                or stopped the upload. FilePizza requires the uploader to stay
                online continuously because files are transferred directly
                between browsers.
              </span>
            </li>
            <li className="flex items-start gap-3 px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800">
              <span className="text-base">🔒</span>
              <span className="text-sm">
                Your network might have strict firewalls or NAT settings, such
                as having UPnP disabled
              </span>
            </li>
            <li className="flex items-start gap-3 px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800">
              <span className="text-base">🌐</span>
              <span className="text-sm">
                Some corporate or school networks block peer-to-peer connections
              </span>
            </li>
          </ul>
        </div>
      </div>
      <ReturnHome />
    </>
  )
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
      {errorMessage && <ErrorMessage message={errorMessage} />}
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

  if (isPasswordRequired) {
    return (
      <PasswordEntry errorMessage={errorMessage} onSubmit={submitPassword} />
    )
  }

  if (errorMessage) {
    return (
      <>
        <ErrorMessage message={errorMessage} />
        <ReturnHome />
      </>
    )
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

  if (!isConnected) {
    return <ConnectingToUploader />
  }

  return <Loading text="Uh oh... Something went wrong." />
}
