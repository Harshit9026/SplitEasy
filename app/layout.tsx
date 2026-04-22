import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import MembershipClaimer from '@/components/MembershipClaimer'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'SplitEasy',
  description: 'Created By Harshit Shukla',
  generator: '',
    icons: {
    icon: [
      { url: "/spliteasy.png", sizes: "32x32", type: "image/png" },
      { url: "/spliteasy.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/spliteasy.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/spliteasy.png"],
  }, // iPhone home screen

};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <MembershipClaimer />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}