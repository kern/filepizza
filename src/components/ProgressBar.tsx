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
    <div className="w-full h-12 bg-stone-200 rounded-md overflow-hidden relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-black font-bold">{Math.round(percentage)}%</span>
      </div>
      <div
        className={`h-full ${
          isComplete ? 'bg-green-500' : 'bg-blue-500'
        } transition-all duration-300 ease-in-out`}
        style={{ width: `${percentage}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold">{Math.round(percentage)}%</span>
      </div>
    </div>
  )
}
