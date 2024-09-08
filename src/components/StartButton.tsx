import React from 'react'

export function StartButton({
  onClick,
}: {
  onClick: React.MouseEventHandler
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
    >
      Start
    </button>
  )
}

export default StartButton
