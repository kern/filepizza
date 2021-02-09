import { Progress } from '@chakra-ui/react'

export default function ProgressBar({
  value,
  max,
}: {
  value: number
  max: number
}): JSX.Element {
  return (
    <Progress
      height="48px"
      colorScheme={value === max ? 'green' : 'blue'}
      value={value}
      max={max}
      borderRadius="md"
    />
  )
}
