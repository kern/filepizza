/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DropZone from '../../src/components/DropZone'

function createFile(name: string) {
  return new File(['hello'], name, { type: 'text/plain' })
}

describe('DropZone', () => {
  it('calls onDrop when file selected', () => {
    const fn = vi.fn()
    const { container } = render(<DropZone onDrop={fn} />)
    const input = container.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [createFile('a.txt')] } })
    expect(fn).toHaveBeenCalled()
  })
})

it('tracks window drag events and passes dropped files to the uploader', async () => {
  const onDrop = vi.fn()
  const { getByText } = render(<DropZone onDrop={onDrop} />)
  const file = new File(['a'], 'dropped.txt')
  const dataTransfer = {
    dropEffect: 'none',
    items: [
      {
        webkitGetAsEntry: () => ({
          isDirectory: false,
          fullPath: '/dropped.txt',
          file: (receive: (file: File) => void) => receive(file),
        }),
      },
    ],
  }

  fireEvent.dragEnter(window)
  expect(getByText('Drop to select 0 files')).toHaveClass('visible')
  fireEvent.dragEnter(window, { dataTransfer })
  expect(getByText('Drop to select 1 file')).toHaveClass('visible')
  fireEvent(
    window,
    new MouseEvent('dragleave', { relatedTarget: document.body }),
  )
  expect(getByText('Drop to select 1 file')).toHaveClass('visible')
  fireEvent.dragLeave(window)
  expect(getByText('Drop to select 1 file')).toHaveClass('invisible')

  fireEvent.dragOver(window)
  fireEvent.dragOver(window, { dataTransfer })
  expect(dataTransfer.dropEffect).toBe('copy')
  fireEvent.drop(window)
  expect(onDrop).not.toHaveBeenCalled()
  fireEvent.drop(window, { dataTransfer })
  await waitFor(() => expect(onDrop).toHaveBeenCalledWith([file]))
})

it('ignores a change event without files', () => {
  const fn = vi.fn()
  const { container } = render(<DropZone onDrop={fn} />)
  const input = container.querySelector('input') as HTMLInputElement
  fireEvent.change(input, { target: { files: null } })
  expect(fn).not.toHaveBeenCalled()
})

it('opens the folder picker and passes the chosen files to the uploader', () => {
  const onDrop = vi.fn()
  const { container } = render(<DropZone onDrop={onDrop} />)
  const input = container.querySelector(
    '#drop-zone-folder-input',
  ) as HTMLInputElement
  expect(input).toHaveAttribute('webkitdirectory')
  const click = vi.spyOn(input, 'click')
  fireEvent.click(container.querySelector('#drop-zone-folder-button')!)
  expect(click).toHaveBeenCalled()

  const file = new File(['a'], 'a.txt')
  Object.defineProperty(file, 'webkitRelativePath', { value: 'docs/a.txt' })
  fireEvent.change(input, { target: { files: [file] } })
  expect(onDrop.mock.calls[0][0][0]).toMatchObject({
    entryFullPath: '/docs/a.txt',
  })
})
