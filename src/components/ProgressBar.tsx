import React from 'react'

export default function ProgressBar({
  value,
  max,
}: {
  value: number
  max: number
}): JSX.Element {
  const percentage = (value / max) * 100
  const isComplete = value === max

  return (
    <div className="w-full h-12 bg-stone-200 rounded-md overflow-hidden">
      <div
        className={`h-full ${
          isComplete ? 'bg-green-500' : 'bg-blue-500'
        } transition-all duration-300 ease-in-out`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
