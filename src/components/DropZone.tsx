import React, { useState, useRef, useCallback } from 'react'
import styled from 'styled-components'
import { extractFileList } from '../fs'

const Wrapper = styled.div`
  display: block;
`

const Overlay = styled.div`
  display: block;
`

interface Props {
  onDrop: (files: any) => void
  children?: React.ReactNode
}

const Dropzone: React.FC<Props> = ({ children, onDrop }: Props) => {
  const overlay = useRef()
  const [focus, setFocus] = useState(false)

  const handleDragEnter = useCallback(() => {
    setFocus(true)
  }, [])

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (e.target !== overlay.current) {
        return
      }

      setFocus(false)
    },
    [overlay.current],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setFocus(false)

      const files = await extractFileList(e)
      onDrop(files)
    },
    [onDrop],
  )

  return (
    <Wrapper
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Overlay ref={overlay} hidden={!focus} />
      {children}
    </Wrapper>
  )
}

export default Dropzone
