/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ConnectionListItem } from '../../src/components/ConnectionListItem'
import { UploaderConnectionStatus } from '../../src/types'

const baseConn = {
  status: UploaderConnectionStatus.Uploading,
  dataConnection: {} as any,
  completedFiles: 1,
  totalFiles: 2,
  currentFileProgress: 0.5,
  browserName: 'Chrome',
  browserVersion: '120',
}

describe('ConnectionListItem', () => {
  it('shows status and progress', () => {
    const { getByText } = render(<ConnectionListItem conn={baseConn} />)
    expect(getByText((c, e) => e?.textContent === 'Chrome v120')).toBeInTheDocument()
    expect(getByText('UPLOADING')).toBeInTheDocument()
    expect(getByText('Completed: 1 / 2 files')).toBeInTheDocument()
  })
})
