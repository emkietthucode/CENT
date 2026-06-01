import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'CEnt — Personal Movie Diary',
  description: 'Track, rate, and log every movie you watch. Your personal cinema diary.',
  keywords: ['movies', 'movie diary', 'movie reviews', 'letterboxd', 'cent'],
  openGraph: {
    title: 'CEnt — Personal Movie Diary',
    description: 'Track, rate, and log every movie you watch.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className="bg-background" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-background text-foreground`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
