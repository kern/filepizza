import Link from 'next/link'
import Spinner from '../components/Spinner'
import Wordmark from '../components/Wordmark'

export const metadata = {
  title: 'FilePizza - 404: Slice Not Found',
  description: 'Oops! This slice of FilePizza seems to be missing.',
}

export default async function NotFound(): Promise<JSX.Element> {
  return (
    <div className="flex flex-col items-center space-y-5 py-10 max-w-2xl mx-auto">
      <Spinner direction="down" />
      <Wordmark />
      <p>
        <strong>404: Looks like this slice of FilePizza is missing!</strong>
      </p>
      <Link href="/" className="text-stone-500 hover:underline">
        Serve up a fresh slice &raquo;
      </Link>
    </div>
  )
}
