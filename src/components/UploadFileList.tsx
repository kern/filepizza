import React from 'react'
import { UploadedFile } from '../types'

interface Props {
  files: UploadedFile[]
}

const UploadFileList: React.FC<Props> = ({ files }: Props) => {
  const items = files.map((f) => <li key={f.fullPath}>{f.fullPath}</li>)
  return <ul>{items}</ul>
}

export default UploadFileList
