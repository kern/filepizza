import { Link } from '@tanstack/react-router'
import { JSX } from 'react'

export default function ReturnHome(): JSX.Element {
  return (
    <div className="flex justify-center">
      <Link
        to="/"
        className="text-stone-500 dark:text-stone-200 hover:underline"
      >
        Serve up a fresh slice &raquo;
      </Link>
    </div>
  )
}
