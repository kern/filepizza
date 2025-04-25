'use client'

import React, { useState, useEffect, JSX } from 'react'
import Image from 'next/image'

type ApiLinkType = {
  href: string
  imageSrc: string
  alt: string
}

export function ApiToast(): JSX.Element {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show toast after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const apiLinks: ApiLinkType[] = [
    {
      href: 'https://texlyre.github.io/filepizza-api',
      imageSrc: '/images/api_demo.png',
      alt: 'API Demo'
    },
    {
      href: 'https://github.com/TeXlyre/filepizza-api',
      imageSrc: '/images/api_github.png',
      alt: 'API GitHub'
    },
    {
      href: 'https://www.npmjs.com/package/filepizza-api',
      imageSrc: '/images/api_npm.png',
      alt: 'API NPM'
    }
  ]

  if (!isVisible) return <></>

  return (
    <div className="fixed top-4 left-4 z-50 shadow-lg rounded-lg overflow-hidden transition-all duration-300 transform backdrop-blur-md bg-white/30 dark:bg-stone-800/30">
      <div className="relative">
        <button
          className="absolute top-2 right-2 bg-white dark:bg-stone-800 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-gray-100 dark:hover:bg-stone-700 transition-colors cursor-pointer z-10"
          onClick={() => setIsVisible(false)}
          aria-label="Close API toast"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-stone-600 dark:text-stone-400"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="relative">
          <Image
            src="/images/api_button.png"
            alt="API Button"
            width={200}
            height={100}
            className="w-full h-auto"
          />

          <div className="absolute bottom-2 right-2 flex flex-col space-y-2">
            {apiLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block transition-transform hover:scale-110"
              >
                <Image
                  src={link.imageSrc}
                  alt={link.alt}
                  width={63}
                  height={20}
                  className="w-auto h-auto"
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApiToast