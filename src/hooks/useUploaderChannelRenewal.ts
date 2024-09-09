import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'

export function useUploaderChannelRenewal(
  shortSlug: string | undefined,
  renewInterval = 5000,
): void {
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: shortSlug }),
      })
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.json()
    },
  })

  useEffect(() => {
    if (!shortSlug) return

    let timeout: NodeJS.Timeout | null = null

    const run = (): void => {
      timeout = setTimeout(() => {
        mutation.mutate()
        run()
      }, renewInterval)
    }

    run()

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [shortSlug, mutation, renewInterval])
}
