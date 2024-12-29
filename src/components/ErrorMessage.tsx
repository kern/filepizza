import { JSX } from 'react'

export function ErrorMessage({ message }: { message: string }): JSX.Element {
  return (
    <div
      className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative"
      role="alert"
    >
      <span className="block sm:inline">{message}</span>
    </div>
  )
}
