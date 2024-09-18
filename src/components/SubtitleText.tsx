import React from 'react'

interface SubtitleTextProps {
  children: React.ReactNode
}

const SubtitleText: React.FC<SubtitleTextProps> = ({ children }) => {
  return <p className="text-sm text-center text-stone-600">{children}</p>
}

export default SubtitleText
