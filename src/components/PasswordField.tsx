import React, { useCallback } from 'react'

export function PasswordField({
  value,
  onChange,
  isRequired,
  isInvalid,
}: {
  value: string
  onChange: (v: string) => void
  isRequired?: boolean
  isInvalid?: boolean
}): JSX.Element {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  return (
    <input
      autoFocus
      type="password"
      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        isInvalid ? 'border-red-500' : 'border-gray-300'
      }`}
      placeholder={
        isRequired ? 'Enter password...' : 'Add password (optional)...'
      }
      value={value}
      onChange={handleChange}
    />
  )
}

export default PasswordField
