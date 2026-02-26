import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import Navigation from "@/components/navigation"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/providers"
import AIAssistant from "@/components/ai-assistant"
import { initializeServer } from "@/lib/init.js"

// Initialize server services (database, cache, etc.)
initializeServer().catch(console.error)

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata = {
  title: "Cinnect",
  description: "Cinnect - Where cinema connects people. Discover, watch, and discuss your favorite movies and TV shows.",
  generator: "v0.app",
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <Providers>
          <Navigation />
          <div className="pt-16 pb-16 md:pb-0">
            {children}
          </div>
          <Toaster />
          <AIAssistant />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
