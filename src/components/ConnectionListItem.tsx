import React, { JSX } from 'react'
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
        return 'bg-blue-500 dark:bg-blue-600'
      case UploaderConnectionStatus.Paused:
        return 'bg-yellow-500 dark:bg-yellow-600'
      case UploaderConnectionStatus.Done:
        return 'bg-green-500 dark:bg-green-600'
      case UploaderConnectionStatus.Closed:
        return 'bg-red-500 dark:bg-red-600'
      case UploaderConnectionStatus.InvalidPassword:
        return 'bg-red-500 dark:bg-red-600'
      default:
        return 'bg-stone-500 dark:bg-stone-600'
    }
  }

  return (
    <div className="w-full mt-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
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
            {conn.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="text-sm text-stone-500 dark:text-stone-400">
          <div>
            Completed: {conn.completedFiles} / {conn.totalFiles} files
          </div>
          {conn.uploadingFileName &&
            conn.status === UploaderConnectionStatus.Uploading && (
              <div>
                Current file: {Math.round(conn.currentFileProgress * 100)}%
              </div>
            )}
        </div>
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
