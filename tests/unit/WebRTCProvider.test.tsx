/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ iceServers: [] })))) )
vi.mock('peerjs', () => ({
  default: class { id = 'peer1'; on(event: string, cb: (id: string) => void) { if (event === 'open') cb('peer1') } off() {} },
}))

import WebRTCProvider from '../../src/components/WebRTCProvider'

const Child = () => <div>child</div>

describe('WebRTCProvider', () => {
  it('renders children after init', async () => {
    const { getByText } = render(
      <WebRTCProvider>
        <Child />
      </WebRTCProvider>,
    )
    await waitFor(() => expect(getByText('child')).toBeInTheDocument())
  })
})
