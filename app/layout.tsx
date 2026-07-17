import type { Metadata, Viewport } from 'next'
import RegisterSW from './register-sw'
import './globals.css' // sesuaikan dengan import yang sudah ada

export const metadata: Metadata = {
  title: 'Arisan Mingguan Ibu-ibu',
  description: 'Aplikasi manajemen arisan mingguan',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Arisanku',
  },
}

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  )
}