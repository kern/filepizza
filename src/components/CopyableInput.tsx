import React from 'react'
import useClipboard from '../hooks/useClipboard'
import InputLabel from './InputLabel'

export function CopyableInput({
  label,
  value,
}: {
  label: string
  value: string
}): JSX.Element {
  const { hasCopied, onCopy } = useClipboard(value)

  return (
    <div className="flex flex-col w-full">
      <InputLabel>{label}</InputLabel>
      <div className="flex w-full">
        <input
          className="flex-grow px-3 py-2 text-xs border border-r-0 rounded-l"
          value={value}
          readOnly
        />
        <button
          className="px-4 py-2 text-sm text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-r border-t border-r border-b"
          onClick={onCopy}
        >
          {hasCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
