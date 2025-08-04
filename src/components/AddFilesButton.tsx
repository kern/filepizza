import React, { useRef, useCallback, JSX } from 'react'
import { UploadedFile } from '../types'

export default function AddFilesButton({
  onAdd,
}: {
  onAdd: (files: UploadedFile[]) => void
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onAdd(Array.from(e.target.files) as UploadedFile[])
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
      <button
        id="add-files-button"
        type="button"
        onClick={handleClick}
        className="underline text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors duration-200"
      >
        Add more files
      </button>
    </>
  )
}
