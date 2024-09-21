import React from 'react'
import Image from 'next/image'

export default function Wordmark(): JSX.Element {
  return (
    <Image
      src="/images/wordmark.png"
      className="max-h-12 dark:brightness-0 dark:invert"
      alt="FilePizza Wordmark"
      width={200}
      height={45}
    />
  )
}
