import React, { JSX } from 'react'

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
    <div className="w-full h-12 bg-stone-200 dark:bg-stone-700 rounded-md overflow-hidden relative shadow-sm">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-black font-bold">{Math.round(percentage)}%</span>
      </div>
      <div
        className={`h-full ${
          isComplete
            ? 'bg-gradient-to-b from-green-500 to-green-600'
            : 'bg-gradient-to-b from-blue-500 to-blue-600'
        } transition-all duration-300 ease-in-out`}
        style={{ width: `${percentage}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold text-shadow">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  )
}
