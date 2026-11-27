/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ConnectionListItem } from '../../src/components/ConnectionListItem'
import { UploaderConnectionStatus } from '../../src/types'
import { TestDownloadConnection } from '../support/providers'

const baseConn = {
  status: UploaderConnectionStatus.Uploading,
  dataConnection: new TestDownloadConnection(),
  uploadingFileName: 'file.txt',
  completedFiles: 1,
  totalFiles: 2,
  currentFileProgress: 0.5,
  browserName: 'Chrome',
  browserVersion: '120',
}

describe('ConnectionListItem', () => {
  it('shows status and progress', () => {
    const { getByText } = render(<ConnectionListItem conn={baseConn} />)
    expect(
      getByText((c, e) => e?.textContent === 'Chrome v120'),
    ).toBeInTheDocument()
    expect(getByText('Current file: 50%')).toBeInTheDocument()
    expect(getByText('UPLOADING')).toBeInTheDocument()
    expect(getByText('Completed: 1 / 2 files')).toBeInTheDocument()
  })
})

it.each([
  [UploaderConnectionStatus.Paused, 'bg-yellow-500'],
  [UploaderConnectionStatus.Done, 'bg-green-500'],
  [UploaderConnectionStatus.Closed, 'bg-red-500'],
  [UploaderConnectionStatus.InvalidPassword, 'bg-red-500'],
  [UploaderConnectionStatus.Ready, 'bg-stone-500'],
])('shows the status and color for %s', (status, color) => {
  const { getByText, queryByText } = render(
    <ConnectionListItem
      conn={{
        ...baseConn,
        status,
        browserName: 'Firefox',
        browserVersion: '142',
        completedFiles: 2,
      }}
    />,
  )
  expect(getByText(status.replace(/_/g, ' '))).toHaveClass(color)
  expect(getByText('v142')).toBeInTheDocument()
  expect(queryByText(/Current file/)).toBeNull()
})

it('falls back to the generic downloader label when the version is missing', () => {
  const { getByText } = render(
    <ConnectionListItem conn={{ ...baseConn, browserVersion: undefined }} />,
  )
  expect(getByText('Downloader')).toBeInTheDocument()
})
