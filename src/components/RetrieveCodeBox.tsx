import React, { JSX } from 'react'
import { CopyableIcon } from './CopyableIcon'
import config from '../config'

export function RetrieveCodeBox({
  retrieveCode,
}: {
  retrieveCode: string
}): JSX.Element {
  return (
    <div className="flex-auto text-center pr-12">
      <div className="flex items-center justify-center space-x-2">
        <h2 className="text-lg font-semibold">File Retrieve Code</h2>
        <CopyableIcon value={retrieveCode} />
      </div>
      <div className="flex justify-center space-x-2 mt-2">
        {Array(config.retrieveCodeSlug.numChars)
          .fill('')
          .map((_, index) => (
            <div
              key={index}
              className="w-10 h-10 border border-gray-500 rounded text-center flex items-center justify-center"
            >
              {retrieveCode[index]}
            </div>
          ))}
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Use the above code to retrieve the file.
      </p>
    </div>
  )
}
