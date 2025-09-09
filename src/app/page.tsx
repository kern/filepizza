'use client'

import React, { JSX, useCallback, useState, useMemo } from 'react'
import { getFileName } from '../fs'
import { UploadedFile } from '../types'
import { pluralize } from '../utils/pluralize'
import WebRTCPeerProvider from '../components/WebRTCProvider'
import DropZone from '../components/DropZone'
import UploadFileList from '../components/UploadFileList'
import Uploader from '../components/Uploader'
import PasswordField from '../components/PasswordField'
import SharedLinkField from '../components/SharedLinkField'
import StartButton from '../components/StartButton'
import Spinner from '../components/Spinner'
import Wordmark from '../components/Wordmark'
import CancelButton from '../components/CancelButton'
import TitleText from '../components/TitleText'
import SubtitleText from '../components/SubtitleText'
import TermsAcceptance from '../components/TermsAcceptance'
import AddFilesButton from '../components/AddFilesButton'

function PageWrapper({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col items-center space-y-5 py-10 max-w-2xl mx-auto px-4">
      <Spinner direction="up" />
      <Wordmark />
      {children}
    </div>
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
        <TitleText>Peer-to-peer file transfers in your browser.</TitleText>
      </div>
      <DropZone onDrop={onDrop} />
      <TermsAcceptance />
    </PageWrapper>
  )
}

function useUploaderFileListData(uploadedFiles: UploadedFile[]) {
  return useMemo(() => {
    return uploadedFiles.map((item) => ({
      fileName: getFileName(item),
      type: item.type,
    }))
  }, [uploadedFiles])
}

function extractSlugFromLink(link: string): string | undefined {
  if (!link) return undefined

  try {
    const url = new URL(link)
    const pathParts = url.pathname.split('/')
    return pathParts[pathParts.length - 1]
  } catch {
    return link.trim() ? link.trim() : undefined
  }
}

function ConfirmUploadState({
  uploadedFiles,
  password,
  sharedLink,
  onChangePassword,
  onChangeSharedLink,
  onCancel,
  onStart,
  onRemoveFile,
  onAddFiles,
}: {
  uploadedFiles: UploadedFile[]
  password: string
  sharedLink: string
  onChangePassword: (pw: string) => void
  onChangeSharedLink: (link: string) => void
  onCancel: () => void
  onStart: () => void
  onRemoveFile: (index: number) => void
  onAddFiles: (files: UploadedFile[]) => void
}): JSX.Element {
  const fileListData = useUploaderFileListData(uploadedFiles)
  return (
    <PageWrapper>
      <TitleText>
        You are about to start uploading{' '}
        {pluralize(uploadedFiles.length, 'file', 'files')}.{' '}
        <AddFilesButton onAdd={onAddFiles} />
      </TitleText>
      <UploadFileList files={fileListData} onRemove={onRemoveFile} />
      <PasswordField value={password} onChange={onChangePassword} />
      <SharedLinkField value={sharedLink} onChange={onChangeSharedLink} />
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
  sharedLink,
  onStop,
}: {
  uploadedFiles: UploadedFile[]
  password: string
  sharedLink: string
  onStop: () => void
}): JSX.Element {
  const fileListData = useUploaderFileListData(uploadedFiles)
  const sharedSlug = extractSlugFromLink(sharedLink)

  return (
    <PageWrapper>
      <TitleText>
        You are uploading {pluralize(uploadedFiles.length, 'file', 'files')}.
      </TitleText>
      <SubtitleText>
        Leave this tab open. FilePizza does not store files.
      </SubtitleText>
      <UploadFileList files={fileListData} />
      <WebRTCPeerProvider>
        <Uploader files={uploadedFiles} password={password} sharedSlug={sharedSlug} onStop={onStop} />
      </WebRTCPeerProvider>
    </PageWrapper>
  )
}

export default function UploadPage(): JSX.Element {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [password, setPassword] = useState('')
  const [sharedLink, setSharedLink] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleDrop = useCallback((files: UploadedFile[]): void => {
    setUploadedFiles(files)
  }, [])

  const handleChangePassword = useCallback((pw: string) => {
    setPassword(pw)
  }, [])

  const handleChangeSharedLink = useCallback((link: string) => {
    setSharedLink(link)
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

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles((fs) => fs.filter((_, i) => i !== index))
  }, [])

  const handleAddFiles = useCallback((files: UploadedFile[]) => {
    setUploadedFiles((fs) => [...fs, ...files])
  }, [])

  if (!uploadedFiles.length) {
    return <InitialState onDrop={handleDrop} />
  }

  if (!uploading) {
    return (
      <ConfirmUploadState
        uploadedFiles={uploadedFiles}
        password={password}
        sharedLink={sharedLink}
        onChangePassword={handleChangePassword}
        onChangeSharedLink={handleChangeSharedLink}
        onCancel={handleCancel}
        onStart={handleStart}
        onRemoveFile={handleRemoveFile}
        onAddFiles={handleAddFiles}
      />
    )
  }

  return (
    <UploadingState
      uploadedFiles={uploadedFiles}
      password={password}
      sharedLink={sharedLink}
      onStop={handleStop}
    />
  )
}
