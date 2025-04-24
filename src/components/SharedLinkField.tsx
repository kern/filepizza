'use client'

import React, { JSX, useCallback } from 'react'
import InputLabel from './InputLabel'

export default function SharedLinkField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}): JSX.Element {
  const handleChange = useCallback(
    function (e: React.ChangeEvent<HTMLInputElement>): void {
      onChange(e.target.value)
    },
    [onChange],
  )

  return (
    <div className="flex flex-col w-full">
      <InputLabel
        tooltip="Enter a shared link to collaborate with other uploaders. If this is filled, others with the same link will be able to provide the same files to downloaders. Leave empty to create a new upload."
      >
        Shared Link (optional)
      </InputLabel>
      <input
        type="text"
        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
        placeholder="Paste a shared link to collaborate with others..."
        value={value}
        onChange={handleChange}
      />
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        You can paste either a full URL or just the slug. When shared, multiple uploaders can provide the same files, making downloads more reliable.
      </p>
    </div>
  )
}