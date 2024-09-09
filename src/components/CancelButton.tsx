import React from 'react'

export default function CancelButton({
  onClick,
}: {
  onClick: React.MouseEventHandler
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      Cancel
    </button>
  )
}
