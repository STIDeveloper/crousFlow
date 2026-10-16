'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { MotionConfig } from 'framer-motion'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {/* Thème fixe : clair pour l'étudiant ; l'espace personnel applique .theme-staff lui-même. */}
      <NextThemesProvider attribute="class" forcedTheme="light">
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </NextThemesProvider>
    </QueryClientProvider>
  )
}
