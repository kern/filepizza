import React from 'react'

function getTypeColor(fileType: string): string {
  if (fileType.startsWith('image/')) return 'bg-blue-100 text-blue-800'
  if (fileType.startsWith('text/')) return 'bg-green-100 text-green-800'
  if (fileType.startsWith('audio/')) return 'bg-purple-100 text-purple-800'
  if (fileType.startsWith('video/')) return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

export default function TypeBadge({ type }: { type: string }): JSX.Element {
  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(
        type,
      )} transition-all duration-300 mr-2`}
    >
      {type}
    </span>
  )
}
