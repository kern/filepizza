import React, { JSX } from 'react'

function getTypeColor(fileType: string): string {
  if (fileType.startsWith('image/'))
    return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
  if (fileType.startsWith('text/'))
    return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
  if (fileType.startsWith('audio/'))
    return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
  if (fileType.startsWith('video/'))
    return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
  return 'bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200'
}

export default function TypeBadge({ type }: { type: string }): JSX.Element {
  return (
    <div
      className={`px-2 py-1 text-[10px] font-semibold rounded ${getTypeColor(
        type,
      )} transition-all duration-300`}
    >
      {type}
    </div>
  )
}
