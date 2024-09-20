import Link from 'next/link'

export default function ReturnHome(): JSX.Element {
  return (
    <div className="flex justify-center">
      <Link href="/" className="text-stone-500 hover:underline">
        Serve up a fresh slice &raquo;
      </Link>
    </div>
  )
}
