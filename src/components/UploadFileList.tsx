import React from 'react'
import TypeBadge from './TypeBadge'

type UploadedFileLike = {
  fileName?: string
  type: string
}

export default function UploadFileList({
  files,
  onRemove,
}: {
  files: UploadedFileLike[]
  onRemove?: (index: number) => void
}): JSX.Element {
  const items = files.map((f: UploadedFileLike, i: number) => (
    <div
      key={f.fileName}
      className={`w-full border-b border-stone-300 last:border-0`}
    >
      <div className="flex justify-between items-center py-2 pl-3 pr-2">
        <p className="truncate text-sm font-medium">{f.fileName}</p>
        <div className="flex items-end">
          <TypeBadge type={f.type} />
          {onRemove && (
            <button
              onClick={() => onRemove?.(i)}
              className="text-stone-500 hover:text-stone-700 focus:outline-none pl-3 pr-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  ))

  return (
    <div className="w-full border border-stone-300 rounded-md shadow-sm">
      {items}
    </div>
  )
}
