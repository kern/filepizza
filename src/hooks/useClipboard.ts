import { useState, useCallback, useEffect } from 'react'

export default function useClipboard(
  text: string,
  delay = 1000,
): {
  hasCopied: boolean
  onCopy: () => void
} {
  const [hasCopied, setHasCopied] = useState(false)

  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setHasCopied(true)
    })
  }, [text])

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    if (hasCopied) {
      timeoutId = setTimeout(() => {
        setHasCopied(false)
      }, delay)
    }
    return () => {
      clearTimeout(timeoutId)
    }
  }, [hasCopied, delay])

  return { hasCopied, onCopy }
}
