"use client"

import { UserProvider } from "@/contexts/UserContext"
import { AuthRefreshProvider } from "@/contexts/AuthRefreshContext"
import { SocketProvider } from "@/contexts/SocketContext"

export function Providers({ children }) {
  return (
    <UserProvider>
      <AuthRefreshProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </AuthRefreshProvider>
    </UserProvider>
  )
}
