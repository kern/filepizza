import React from 'react'

export default function InputLabel({
  children,
  hasError = false,
}: {
  children: React.ReactNode
  hasError?: boolean
}): JSX.Element {
  return (
    <label
      className={`text-[10px] mb-0.5 font-bold ${
        hasError ? 'text-red-500' : 'text-stone-400'
      }`}
    >
      {children}
    </label>
  )
}
