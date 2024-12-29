import React, { JSX } from 'react'

export default function InputLabel({
  children,
  hasError = false,
  tooltip,
}: {
  children: React.ReactNode
  hasError?: boolean
  tooltip?: string
}): JSX.Element {
  return (
    <div className="relative flex items-center gap-1">
      <label
        className={`text-[10px] mb-0.5 font-bold group relative inline-block ${
          hasError ? 'text-red-500' : 'text-stone-400'
        }`}
      >
        {children}
      </label>
      {tooltip && (
        <div className="relative">
          <div
            className="text-[11px] text-stone-400 dark:text-stone-400 cursor-help hover:opacity-80 peer focus:opacity-80"
            role="button"
            aria-label="Show tooltip"
            tabIndex={0}
          >
            ⓘ
          </div>
          <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-1 opacity-0 peer-hover:opacity-100 peer-focus:opacity-100 transition-opacity duration-200 z-10">
            <div className="bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-100 text-xs rounded px-3 py-2 w-[320px] border border-stone-200 dark:border-stone-700 shadow-lg">
              {tooltip}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
