import React from 'react'
import { useRouter } from 'next/router'

const DownloadPage: React.FC = () => {
  const router = useRouter()
  const { slug } = router.query

  return <div>{JSON.stringify(slug)}</div>
}

export default DownloadPage
