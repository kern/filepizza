import React from 'react'

interface SubtitleTextProps {
  children: React.ReactNode
}

const SubtitleText: React.FC<SubtitleTextProps> = ({ children }) => {
  return (
    <p className="text-sm text-center text-stone-600 dark:text-stone-400">
      {children}
    </p>
  )
}

export default SubtitleText
