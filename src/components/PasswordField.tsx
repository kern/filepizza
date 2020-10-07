import React, { useCallback } from 'react'
import styled from 'styled-components'

const StyledPasswordInput = styled.input`
  background: red;
`

interface Props {
  value: string
  onChange: (value: string) => void
}

export const PasswordField: React.FC<Props> = ({ value, onChange }: Props) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }, [])

  return (
    <StyledPasswordInput
      type="password"
      value={value}
      onChange={handleChange}
    />
  )
}

export default PasswordField
