import React from 'react'

export default function TitleText({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  return (
    <p className="text-lg text-center text-stone-800 max-w-md">{children}</p>
  )
}
