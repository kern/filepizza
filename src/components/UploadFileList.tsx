import React from 'react'

type UploadedFileLike = {
  fullPath?: string
  name?: string
  type: string
}

interface Props {
  files: UploadedFileLike[]
  onChange?: (updatedFiles: UploadedFileLike[]) => void
}

const getFileName = (file: UploadedFileLike): string => {
  if (file.fullPath) {
    return file.fullPath.slice(1)
  }
  return file.name || 'Unknown'
}

export function TypeBadge({ type }: { type: string }): JSX.Element {
  const getTypeColor = (fileType: string): string => {
    if (fileType.startsWith('image/')) return 'bg-blue-100 text-blue-800'
    if (fileType.startsWith('text/')) return 'bg-green-100 text-green-800'
    if (fileType.startsWith('audio/')) return 'bg-purple-100 text-purple-800'
    if (fileType.startsWith('video/')) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(
        type,
      )} transition-all duration-300 mr-2`}
    >
      {type}
    </span>
  )
}

export function UploadFileList({ files, onChange }: Props): JSX.Element {
  const handleRemove = (index: number) => {
    if (onChange) {
      const updatedFiles = files.filter((_, i) => i !== index)
      onChange(updatedFiles)
    }
  }

  const items = files.map((f: UploadedFileLike, i: number) => (
    <div
      key={getFileName(f)}
      className="w-full border border-stone-300 rounded-md mb-2 group"
    >
      <div className="flex justify-between items-center py-2 px-2.5">
        <p className="truncate text-sm font-medium">{getFileName(f)}</p>
        <div className="flex items-center">
          <TypeBadge type={f.type} />
          {onChange && (
            <button
              onClick={() => handleRemove(i)}
              className="text-stone-500 hover:text-stone-700 focus:outline-none"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  ))

  return <div className="w-full">{items}</div>
}

export default UploadFileList
