import React from 'react'

type Props = {
  onClick?: React.MouseEventHandler
}

const UnlockButton: React.FC<Props> = ({ onClick }: Props) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200"
    >
      Unlock
    </button>
  )
}

export default UnlockButton
