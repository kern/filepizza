import { useQuery } from '@tanstack/react-query'

function generateURL(slug: string): string {
  const hostPrefix =
    window.location.protocol +
    '//' +
    window.location.hostname +
    (['80', '443'].includes(window.location.port)
      ? ''
      : ':' + window.location.port)
  return `${hostPrefix}/download/${slug}`
}

export function useUploaderChannel(uploaderPeerID: string): {
  loading: boolean
  error: Error | null
  longSlug: string | undefined
  shortSlug: string | undefined
  longURL: string | undefined
  shortURL: string | undefined
} {
  const { isLoading, error, data } = useQuery({
    queryKey: ['uploaderChannel', uploaderPeerID],
    queryFn: async () => {
      const response = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploaderPeerID }),
      })
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.json()
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  })

  const longURL = data?.longSlug ? generateURL(data.longSlug) : undefined
  const shortURL = data?.shortSlug ? generateURL(data.shortSlug) : undefined

  return {
    loading: isLoading,
    error: error as Error | null,
    longSlug: data?.longSlug,
    shortSlug: data?.shortSlug,
    longURL,
    shortURL,
  }
}
