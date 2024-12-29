import { JSX } from 'react'
import Spinner from '../../components/Spinner'
import Wordmark from '../../components/Wordmark'
import TitleText from '../../components/TitleText'
import ReturnHome from '../../components/ReturnHome'

export default function ReportedPage(): JSX.Element {
  return (
    <div className="flex flex-col items-center space-y-5 py-10 max-w-md mx-auto">
      <Spinner direction="down" />
      <Wordmark />

      <TitleText>This delivery has been halted.</TitleText>
      <div className="px-8 py-6 bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
        <h3 className="text-lg font-medium text-stone-800 dark:text-stone-200 mb-4">
          Message from the management
        </h3>
        <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed mb-6">
          Just like a pizza with questionable toppings, we've had to put this
          delivery on hold for potential violations of our terms of service. Our
          delivery quality team is looking into it to ensure we maintain our
          high standards.
        </p>
        <div className="text-sm text-stone-500 dark:text-stone-400 italic">
          - The FilePizza Team
        </div>
      </div>

      <ReturnHome />
    </div>
  )
}
