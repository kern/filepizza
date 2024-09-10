import React from 'react'
import { UploaderConnection, UploaderConnectionStatus } from '../types'
import ProgressBar from './ProgressBar'

export function ConnectionListItem({
  conn,
}: {
  conn: UploaderConnection
}): JSX.Element {
  const getStatusColor = (status: UploaderConnectionStatus) => {
    switch (status) {
      case UploaderConnectionStatus.Uploading:
        return 'bg-green-500'
      case UploaderConnectionStatus.Paused:
        return 'bg-yellow-500'
      case UploaderConnectionStatus.Done:
        return 'bg-blue-500'
      case UploaderConnectionStatus.Closed:
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="w-full mt-4">
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-sm font-medium">
          {conn.browserName && conn.browserVersion ? (
            <>
              {conn.browserName}{' '}
              <span className="text-stone-400">v{conn.browserVersion}</span>
            </>
          ) : (
            'Downloader'
          )}
        </span>
        <span
          className={`px-1.5 py-0.5 text-white rounded-md transition-colors duration-200 font-medium text-[10px] ${getStatusColor(
            conn.status,
          )}`}
        >
          {conn.status}
        </span>
      </div>
      <ProgressBar
        value={
          (conn.completedFiles + conn.currentFileProgress) / conn.totalFiles
        }
        max={1}
      />
    </div>
  )
}
