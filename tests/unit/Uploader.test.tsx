/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

var mockUseUploaderChannel: any

vi.mock('../../src/components/WebRTCProvider', () => ({
  useWebRTCPeer: () => ({ peer: { id: '1' }, stop: vi.fn() }),
}))
vi.mock('../../src/hooks/useUploaderChannel', () => ({
  useUploaderChannel: (...args: any[]) => mockUseUploaderChannel(...args),
}))
vi.mock('../../src/hooks/useUploaderConnections', () => ({ useUploaderConnections: () => [] }))
vi.mock('react-qr-code', () => ({ default: () => <div>QR</div> }))
vi.mock('../../src/components/CopyableInput', () => ({ CopyableInput: () => <div>Input</div> }))
vi.mock('../../src/components/ConnectionListItem', () => ({ ConnectionListItem: () => <div>Item</div> }))
vi.mock('../../src/components/StopButton', () => ({ default: () => <button>Stop</button> }))

import Uploader from '../../src/components/Uploader'

describe('Uploader', () => {
  it('shows loading when channel loading', () => {
    mockUseUploaderChannel = vi.fn().mockReturnValueOnce({
      isLoading: true,
      error: null,
      longSlug: undefined,
      shortSlug: undefined,
      longURL: undefined,
      shortURL: undefined,
    })
    const { getByText } = render(<Uploader files={[]} password="" onStop={() => {}} />)
    expect(getByText('Creating channel...')).toBeInTheDocument()
  })
})
