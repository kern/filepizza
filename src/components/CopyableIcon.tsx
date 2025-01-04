import React, { JSX } from 'react'
import { ClipboardIcon } from '@heroicons/react/24/outline'
import useClipboard from '../hooks/useClipboard'

export function CopyableIcon({ value }: { value: string }): JSX.Element {
  const { hasCopied, onCopy } = useClipboard(value)

  return (
    <div className="relative flex items-center">
      <ClipboardIcon
        onClick={onCopy}
        className="w-6 h-6 text-gray-500 cursor-pointer hover:text-gray-600"
      />
      {hasCopied && (
        <span className="absolute ml-8 text-sm text-green-500">Copied!</span>
      )}
    </div>
  )
}
