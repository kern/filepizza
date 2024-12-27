'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export type ThemeProviderProps = Parameters<typeof NextThemesProvider>[0]
export const ThemeProvider = NextThemesProvider as React.FC<ThemeProviderProps>
