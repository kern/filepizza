import { JSX } from 'react'
import Spinner from '../components/Spinner'
import Wordmark from '../components/Wordmark'
import ReturnHome from '../components/ReturnHome'
import TitleText from '../components/TitleText'

export const metadata = {
  title: 'FilePizza - 404: Slice Not Found',
  description: 'Oops! This slice of FilePizza seems to be missing.',
}

export default async function NotFound(): Promise<JSX.Element> {
  return (
    <div className="flex flex-col items-center space-y-5 py-10 max-w-2xl mx-auto">
      <Spinner direction="down" />
      <Wordmark />
      <TitleText>404: Looks like this slice of FilePizza got eaten!</TitleText>
      <ReturnHome />
    </div>
  )
}
