import React, { JSX } from 'react'

export default function CancelButton({
  onClick,
  text = 'Cancel',
}: {
  onClick: React.MouseEventHandler
  text?: string
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-md hover:bg-stone-50 dark:hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
    >
      {text}
    </button>
  )
}
