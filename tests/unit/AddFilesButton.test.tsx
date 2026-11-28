import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AddFilesButton from '../../src/components/AddFilesButton'

describe('AddFilesButton', () => {
  it('opens the picker, adds selected files and resets the input', () => {
    const onAdd = vi.fn()
    const { container } = render(<AddFilesButton onAdd={onAdd} />)
    const input = container.querySelector('input') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    fireEvent.click(container.querySelector('#add-files-button')!)
    expect(click).toHaveBeenCalled()

    const file = new File(['a'], 'a.txt')
    fireEvent.change(input, { target: { files: [file] } })
    expect(onAdd).toHaveBeenCalledWith([file])
  })

  it('ignores a change event without files', () => {
    const onAdd = vi.fn()
    const { container } = render(<AddFilesButton onAdd={onAdd} />)
    fireEvent.change(container.querySelector('input')!, {
      target: { files: null },
    })
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it("opens the folder picker and keeps each file's path inside the folder", () => {
    const onAdd = vi.fn()
    const { container } = render(<AddFilesButton onAdd={onAdd} />)
    const input = container.querySelector(
      '#add-folder-input',
    ) as HTMLInputElement
    expect(input).toHaveAttribute('webkitdirectory')
    const click = vi.spyOn(input, 'click')
    fireEvent.click(container.querySelector('#add-folder-button')!)
    expect(click).toHaveBeenCalled()

    const file = new File(['a'], 'a.txt')
    Object.defineProperty(file, 'webkitRelativePath', {
      value: 'photos/a.txt',
    })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0][0]).toMatchObject({
      name: 'a.txt',
      entryFullPath: '/photos/a.txt',
    })
  })
})
