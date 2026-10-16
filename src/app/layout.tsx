import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Raleway } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers/Providers'
import { Toaster } from 'sonner'

const raleway = Raleway({
  variable: '--font-raleway',
  subsets: ['latin'],
})

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'CrousFlow — Réservez votre repas, sans file',
    template: '%s · CrousFlow',
  },
  description:
    'CrousFlow : réservation des repas en restaurant universitaire, ticket QR au retrait et prévision de la production pour réduire les files et le gaspillage.',
  applicationName: 'CrousFlow',
}

export const viewport: Viewport = {
  themeColor: '#01abd5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${raleway.variable} ${geistSans.variable} ${geistMono.variable} bg-canvas text-ink font-sans antialiased`}
      >
        <Providers>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </Providers>
      </body>
    </html>
  )
}
