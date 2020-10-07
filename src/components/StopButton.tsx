import React from 'react'
import styled from 'styled-components'

const StyledStopButton = styled.button`
  background: blue;
`

type Props = {
  onClick: React.MouseEventHandler
}

const StopButton: React.FC<Props> = ({ onClick }: Props) => {
  return <StyledStopButton onClick={onClick}>Stop</StyledStopButton>
}

export default StopButton
