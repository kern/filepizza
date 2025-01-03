import React, { JSX, useRef, useState } from 'react'
import config from '../config'

type DownloadZoneProps = {
  onComplete: (code: string) => void
}

export default function DownloadZone({
  onComplete,
}: DownloadZoneProps): JSX.Element {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const [code, setCode] = useState<string[]>(
    Array(config.retrieveCodeSlug.numChars).fill(''),
  )

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const value = e.target.value
    // Only allow chars defined in config, in fact, it only has at most 1 char
    if (
      !value
        .split('')
        .every((char) => config.retrieveCodeSlug.chars.includes(char))
    ) {
      e.target.value = ''
      return
    }

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < inputsRef.current.length - 1) {
      const nextInput = inputsRef.current[index + 1]
      nextInput?.focus()
      nextInput?.select()
    }

    if (index === inputsRef.current.length - 1 && value) {
      onComplete(newCode.join(''))
    }
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === 'Backspace' && !e.currentTarget.value && index > 0) {
      const prevInput = inputsRef.current[index - 1]
      prevInput?.focus()
      prevInput?.select()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      const prevInput = inputsRef.current[index - 1]
      prevInput?.focus()
      prevInput?.select()
    } else if (e.key === 'ArrowRight' && index < inputsRef.current.length - 1) {
      const nextInput = inputsRef.current[index + 1]
      nextInput?.focus()
      nextInput?.select()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = e.clipboardData.getData('Text')
    const validChars = pasteData
      .split('')
      .filter((char) => config.retrieveCodeSlug.chars.includes(char))
    const newCode = validChars.slice(0, config.retrieveCodeSlug.numChars)

    newCode.forEach((char, index) => {
      if (inputsRef.current[index]) {
        inputsRef.current[index]!.value = char
      }
    })

    setCode(newCode)

    if (newCode.length === config.retrieveCodeSlug.numChars) {
      onComplete(newCode.join(''))
    }
  }

  return (
    <div className="mt-4 text-center">
      <h2 className="text-lg font-semibold">Retrieve your file</h2>
      <div className="flex justify-center space-x-2 mt-2">
        {Array(config.retrieveCodeSlug.numChars)
          .fill('')
          .map((_, index) => (
            <input
              key={index}
              type="text"
              maxLength={1}
              className="w-10 h-10 border border-gray-500 rounded text-center"
              onChange={(e) => handleInputChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              ref={(el) => {
                if (el) {
                  inputsRef.current[index] = el
                }
              }}
            />
          ))}
      </div>
      <p className="text-sm text-gray-500 mt-2">
        Enter the code to download file.
      </p>
    </div>
  )
}
