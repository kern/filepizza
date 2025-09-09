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
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setHasCopied(true)
        })
        .catch((error) => {
          console.error('Clipboard API error:', error)
          fallbackCopyText(text)
        })
    } else {
      fallbackCopyText(text)
    }
  }, [text])

  const fallbackCopyText = (textToCopy: string) => {
    const textArea = document.createElement('textarea')
    textArea.value = textToCopy

    textArea.style.position = 'absolute'
    textArea.style.left = '-999999px'

    document.body.appendChild(textArea)
    textArea.select()

    try {
      document.execCommand('copy')
      setHasCopied(true)
    } catch (error) {
      console.error('execCommand:', error)
    } finally {
      textArea.remove()
    }
  }

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
