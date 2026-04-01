"use client"

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import { io as ioClient } from "socket.io-client"
import { useUser } from "@/contexts/UserContext"

const SocketContext = createContext(null)

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ children }) {
  const { user } = useUser()
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  const listenersRef = useRef(new Set())

  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setConnected(false)
      }
      return
    }

    // Already connected
    if (socketRef.current?.connected) return

    // Connect to external socket server (or local in development)
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
    const isExternal = !!socketUrl

    console.log("[SOCKET] Connecting to:", socketUrl || window.location.origin)
    console.log("[SOCKET] External server:", isExternal)

    // Fetch auth token from server-side endpoint (httpOnly cookies can't be read client-side)
    const getAuthToken = async () => {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include', // Send httpOnly cookies
        })
        
        if (!response.ok) {
          console.error("[SOCKET] Failed to get auth token from server")
          return null
        }
        
        const data = await response.json()
        return data.accessToken || null
      } catch (error) {
        console.error("[SOCKET] Error fetching auth token:", error)
        return null
      }
    }

    // Async initialization to fetch token from server
    ;(async () => {
      const token = await getAuthToken()
      console.log("[SOCKET] Auth token found:", !!token)

      const socket = ioClient(socketUrl || window.location.origin, {
        path: isExternal ? "/socket.io" : "/api/socketio",
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        withCredentials: true,
        auth: {
          token: token
        }
      })

      socket.on("connect", () => {
        console.log("[SOCKET] Socket connected:", socket.id)
        setConnected(true)
      })

      socket.on("disconnect", (reason) => {
        console.log("[SOCKET] Socket disconnected:", reason)
        setConnected(false)
      })

      socket.on("connect_error", (err) => {
        console.warn("[SOCKET] Socket connection error:", err.message)
      })

      socketRef.current = socket

      // Attach any listeners that were registered before the socket connected
      listenersRef.current.forEach(({ event, handler }) => {
        socket.on(event, handler)
      })
    })()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setConnected(false)
      }
    }
  }, [user])

  /**
   * Subscribe to a socket event. Returns an unsubscribe function.
   */
  const on = useCallback((event, handler) => {
    const listener = { event, handler }
    listenersRef.current.add(listener)

    if (socketRef.current) {
      socketRef.current.on(event, handler)
    }

    return () => {
      listenersRef.current.delete(listener)
      if (socketRef.current) {
        socketRef.current.off(event, handler)
      }
    }
  }, [])

  /**
   * Emit a socket event.
   */
  const emit = useCallback((event, data) => {
    const socket = socketRef.current
    if (!socket) return
    socket.emit(event, data)
  }, [])

  return (
    <SocketContext.Provider value={{ connected, on, emit, socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  )
}
