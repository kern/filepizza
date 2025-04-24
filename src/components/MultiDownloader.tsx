'use client'

import React, { useState, JSX, useEffect } from 'react'
import Downloader from './Downloader'

export default function MultiDownloader({
  primaryUploaderID,
  additionalUploaders,
}: {
  primaryUploaderID: string
  additionalUploaders: string[]
}): JSX.Element {
  const [selectedUploader, setSelectedUploader] = useState<string>(primaryUploaderID)
  const [key, setKey] = useState<number>(0)
  const allUploaders = [primaryUploaderID, ...additionalUploaders]

  useEffect(() => {
    setKey(prevKey => prevKey + 1)
  }, [selectedUploader])

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full mb-4">
        <h3 className="text-center mb-2 text-stone-700 dark:text-stone-300">
          Multiple uploaders available for this shared link:
        </h3>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {allUploaders.map((uploader, i) => (
            <button
              key={uploader}
              onClick={() => setSelectedUploader(uploader)}
              className={`px-3 py-1 rounded transition-colors duration-200 ${
                selectedUploader === uploader 
                  ? 'bg-green-500 text-white' 
                  : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-600'
              }`}
            >
              Uploader {i + 1}
            </button>
          ))}
        </div>
      </div>

      <Downloader key={key} uploaderPeerID={selectedUploader} />
    </div>
  )
}