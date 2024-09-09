import React, { useCallback } from 'react'

export default function PasswordField(props: {
  value: string
  onChange: (v: string) => void
  isRequired?: boolean
  isInvalid?: boolean
}): JSX.Element {
  const handleChange = useCallback(
    function (e: React.ChangeEvent<HTMLInputElement>): void {
      props.onChange(e.target.value)
    },
    [props.onChange],
  )

  return (
    <input
      autoFocus
      type="password"
      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        props.isInvalid ? 'border-red-500' : 'border-gray-300'
      }`}
      placeholder={
        props.isRequired ? 'Enter password...' : 'Add password (optional)...'
      }
      value={props.value}
      onChange={handleChange}
    />
  )
}
