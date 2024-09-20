import React, { useCallback } from 'react'
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
      <InputLabel hasError={isInvalid}>
        {isRequired ? 'Password' : 'Password (optional)'}
      </InputLabel>
      <input
        autoFocus
        type="password"
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isInvalid ? 'border-red-500' : 'border-stone-300'
        }`}
        placeholder="Enter a secret password for this slice of FilePizza..."
        value={value}
        onChange={handleChange}
      />
    </div>
  )
}
