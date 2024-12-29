import React, { JSX } from 'react'
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
          className="flex-grow px-3 py-2 text-xs border border-r-0 rounded-l text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600"
          value={value}
          readOnly
        />
        <button
          className="px-4 py-2 text-sm text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 rounded-r border-t border-r border-b border-stone-300 dark:border-stone-600"
          onClick={onCopy}
        >
          {hasCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
