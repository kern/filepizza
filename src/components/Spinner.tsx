import React from 'react'
import Image from 'next/image'

export default function Spinner({
  direction,
  isRotating,
}: {
  direction: 'up' | 'down'
  isRotating?: boolean
}): JSX.Element {
  const src = `/images/${direction}.png`
  return (
    <div className="relative w-[300px] h-[300px]">
      <Image
        src="/images/pizza.png"
        alt="Pizza"
        width={300}
        height={300}
        className={isRotating ? 'animate-spin-slow' : ''}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src={src}
          alt={`Arrow pointing ${direction}`}
          width={120}
          height={120}
        />
      </div>
    </div>
  )
}
