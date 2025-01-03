import { useQuery, useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'

function generateURL(slug: string): string {
  const hostPrefix =
    window.location.protocol +
    '//' +
    window.location.hostname +
    (window.location.port ? ':' + window.location.port : '')
  return `${hostPrefix}/download/${slug}`
}

export function useUploaderChannel(
  uploaderPeerID: string,
  renewInterval = 60_000,
): {
  isLoading: boolean
  error: Error | null
  longSlug: string | undefined
  shortSlug: string | undefined
  longURL: string | undefined
  shortURL: string | undefined
  retrieveCode: string | undefined
} {
  const { isLoading, error, data } = useQuery({
    queryKey: ['uploaderChannel', uploaderPeerID],
    queryFn: async () => {
      console.log(
        '[UploaderChannel] creating new channel for peer',
        uploaderPeerID,
      )
      const response = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploaderPeerID }),
      })
      if (!response.ok) {
        console.error(
          '[UploaderChannel] failed to create channel:',
          response.status,
        )
        throw new Error('Network response was not ok')
      }
      const data = await response.json()
      console.log('[UploaderChannel] channel created successfully:', {
        longSlug: data.longSlug,
        shortSlug: data.shortSlug,
      })
      return data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  })

  const secret = data?.secret
  const longSlug = data?.longSlug
  const shortSlug = data?.shortSlug
  const retrieveCode = data?.retrieveCode
  const longURL = longSlug ? generateURL(longSlug) : undefined
  const shortURL = shortSlug ? generateURL(shortSlug) : undefined

  const renewMutation = useMutation({
    mutationFn: async ({ secret: s }: { secret: string }) => {
      console.log('[UploaderChannel] renewing channel for slug', shortSlug)
      const response = await fetch('/api/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: shortSlug, secret: s }),
      })
      if (!response.ok) {
        console.error(
          '[UploaderChannel] failed to renew channel',
          response.status,
        )
        throw new Error('Network response was not ok')
      }
      const data = await response.json()
      console.log('[UploaderChannel] channel renewed successfully')
      return data
    },
  })

  useEffect(() => {
    if (!secret || !shortSlug) return

    let timeout: NodeJS.Timeout | null = null

    const run = (): void => {
      timeout = setTimeout(() => {
        console.log(
          '[UploaderChannel] scheduling channel renewal in',
          renewInterval,
          'ms',
        )
        renewMutation.mutate({ secret })
        run()
      }, renewInterval)
    }

    run()

    return () => {
      if (timeout) {
        console.log('[UploaderChannel] clearing renewal timeout')
        clearTimeout(timeout)
      }
    }
  }, [secret, shortSlug, renewMutation, renewInterval])

  useEffect(() => {
    if (!shortSlug || !secret) return

    const handleUnload = (): void => {
      console.log('[UploaderChannel] destroying channel on page unload')
      // Using sendBeacon for best-effort delivery during page unload
      navigator.sendBeacon('/api/destroy', JSON.stringify({ slug: shortSlug }))
    }

    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [shortSlug, secret])

  return {
    isLoading,
    error,
    longSlug,
    shortSlug,
    longURL,
    shortURL,
    retrieveCode,
  }
}
