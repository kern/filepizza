import React, { useCallback } from 'react'
import { Input } from '@chakra-ui/react'

interface Props {
  value: string
  onChange: (value: string) => void
  isRequired?: boolean
  isInvalid?: boolean
}

export const PasswordField: React.FC<Props> = ({
  value,
  onChange,
  isRequired,
  isInvalid,
}: Props) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }, [])

  return (
    <Input
      autoFocus
      type="password"
      placeholder={
        isRequired ? 'Enter password...' : 'Add password (optional)...'
      }
      value={value}
      onChange={handleChange}
      isInvalid={isInvalid}
    />
  )
}

export default PasswordField
