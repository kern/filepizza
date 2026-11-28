import { JSX } from 'react'
import Spinner from './Spinner'
import Wordmark from './Wordmark'
import ReturnHome from './ReturnHome'
import TitleText from './TitleText'

export default function NotFound(): JSX.Element {
  return (
    <div className="flex flex-col items-center space-y-5 py-10 max-w-2xl mx-auto">
      <Spinner direction="down" />
      <Wordmark />
      <TitleText>404: Looks like this slice of FilePizza got eaten!</TitleText>
      <ReturnHome />
    </div>
  )
}
