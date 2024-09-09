import React from 'react'

export default function InputLabel({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return (
    <label className="text-[10px] text-stone-400 mb-0.5 font-bold">
      {children}
    </label>
  )
}
