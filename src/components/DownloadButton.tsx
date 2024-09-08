import React from 'react'

type Props = {
  onClick?: React.MouseEventHandler
}

const DownloadButton: React.FC<Props> = ({ onClick }: Props) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
    >
      Download
    </button>
  )
}

export default DownloadButton
