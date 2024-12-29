import React, { JSX, useCallback } from 'react'
import InputLabel from './InputLabel'

export default function PasswordField({
  value,
  onChange,
  isRequired = false,
  isInvalid = false,
}: {
  value: string
  onChange: (v: string) => void
  isRequired?: boolean
  isInvalid?: boolean
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
        hasError={isInvalid}
        tooltip="The downloader must provide this password to start downloading the file. If you don't specify a password here, any downloader with the link to the file will be able to download it. It is not used to encrypt the file, as this is performed by WebRTC's DTLS already."
      >
        {isRequired ? 'Password' : 'Password (optional)'}
      </InputLabel>
      <input
        autoFocus
        type="password"
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
          isInvalid
            ? 'border-red-500 dark:border-red-400'
            : 'border-stone-300 dark:border-stone-600'
        } bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100`}
        placeholder="Enter a secret password for this slice of FilePizza..."
        value={value}
        onChange={handleChange}
      />
    </div>
  )
}
