import React from 'react'

export default function CancelButton({
  onClick,
}: {
  onClick: React.MouseEventHandler
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      Cancel
    </button>
  )
}
