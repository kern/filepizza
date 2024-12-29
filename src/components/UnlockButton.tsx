import React, { JSX } from 'react'

export default function UnlockButton({
  onClick,
}: {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-gradient-to-b from-green-500 to-green-600 text-white rounded-md hover:from-green-500 hover:to-green-700 transition-all duration-200 border border-green-600 shadow-sm hover:shadow-md text-shadow"
    >
      Unlock
    </button>
  )
}
