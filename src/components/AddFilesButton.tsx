import React, { useRef, useCallback, JSX } from 'react'
import { filesFromInput } from '../fs'
import { UploadedFile } from '../types'

const linkClass =
  'underline text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors duration-200'

export default function AddFilesButton({
  onAdd,
}: {
  onAdd: (files: UploadedFile[]) => void
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFilesClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFolderClick = useCallback(() => {
    folderInputRef.current?.click()
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onAdd(filesFromInput(e.target.files))
        e.target.value = ''
      }
    },
    [onAdd],
  )

  return (
    <>
      <input
        id="add-files-input"
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleChange}
      />
      <input
        id="add-folder-input"
        type="file"
        ref={folderInputRef}
        className="hidden"
        webkitdirectory=""
        onChange={handleChange}
      />
      <button
        id="add-files-button"
        type="button"
        onClick={handleFilesClick}
        className={linkClass}
      >
        Add more files
      </button>
      {' · '}
      <button
        id="add-folder-button"
        type="button"
        onClick={handleFolderClick}
        className={linkClass}
      >
        Add a folder
      </button>
    </>
  )
}
