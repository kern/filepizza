import React from 'react'

export default function UnlockButton({
  onClick,
}: {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
    >
      Unlock
    </button>
  )
}
