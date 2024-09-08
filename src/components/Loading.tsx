import React from 'react'

export default function Loading({ text }: { text: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-gray-600 mt-2">{text}</p>
    </div>
  )
}
