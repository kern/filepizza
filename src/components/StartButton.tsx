import React from 'react'
import styled from 'styled-components'

const StyledStartButton = styled.button`
  background: green;
`

type Props = {
  onClick: React.MouseEventHandler
}

const StartButton: React.FC<Props> = ({ onClick }: Props) => {
  return <StyledStartButton onClick={onClick}>Start</StyledStartButton>
}

export default StartButton
