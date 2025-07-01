/// <reference types="@testing-library/jest-dom" />
import { vi } from 'vitest'
vi.mock('next-view-transitions', () => ({ Link: (p: any) => <a {...p}>{p.children}</a> }))
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  ConnectingToUploader,
  DownloadComplete,
  DownloadInProgress,
  ReadyToDownload,
  PasswordEntry,
} from '../../src/components/Downloader'

const files = [{ fileName: 'a.txt', size: 1, type: 'text/plain' }]

describe('Downloader subcomponents', () => {
  it('ConnectingToUploader shows troubleshooting', async () => {
    const { getByText } = render(
      <ConnectingToUploader showTroubleshootingAfter={0} />,
    )
    await waitFor(() => {
      expect(getByText('Having trouble connecting?')).toBeInTheDocument()
    })
  })

  it('DownloadComplete lists files', () => {
    const { getByText } = render(
      <DownloadComplete filesInfo={files} bytesDownloaded={1} totalSize={1} />,
    )
    expect(getByText('You downloaded 1 file.')).toBeInTheDocument()
  })

  it('DownloadInProgress shows stop button', () => {
    const { getByText } = render(
      <DownloadInProgress filesInfo={files} bytesDownloaded={0} totalSize={1} onStop={() => {}} />,
    )
    expect(getByText('Stop Download')).toBeInTheDocument()
  })

  it('ReadyToDownload shows start button', () => {
    const { getByText } = render(
      <ReadyToDownload filesInfo={files} onStart={() => {}} />,
    )
    expect(getByText('Download')).toBeInTheDocument()
  })

  it('PasswordEntry submits value', () => {
    let submitted = ''
    const { getByPlaceholderText, getByText } = render(
      <PasswordEntry errorMessage={null} onSubmit={(v) => (submitted = v)} />,
    )
    fireEvent.change(
      getByPlaceholderText('Enter a secret password for this slice of FilePizza...'),
      { target: { value: 'secret' } },
    )
    fireEvent.submit(getByText('Unlock'))
    expect(submitted).toBe('secret')
  })
})
