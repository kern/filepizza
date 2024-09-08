import React from 'react'

type Props = {
  onClick: React.MouseEventHandler
  isDownloading?: boolean
}

const StopButton: React.FC<Props> = ({ isDownloading, onClick }: Props) => {
  return (
    <button
      className="px-2 py-1 text-xs text-orange-500 bg-transparent hover:bg-orange-100 rounded transition-colors duration-200"
      onClick={onClick}
    >
      {isDownloading ? 'Stop Download' : 'Stop Upload'}
    </button>
  )
}

export default StopButton
