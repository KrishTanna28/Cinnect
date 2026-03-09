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
    const token = localStorage.getItem("token")
    if (!user || !token) {
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

    const socket = ioClient({
      path: "/api/socketio",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
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

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [user])

  /**
   * Subscribe to a socket event. Returns an unsubscribe function.
   */
  const on = useCallback((event, handler) => {
    const socket = socketRef.current
    if (!socket) return () => {}
    socket.on(event, handler)
    return () => socket.off(event, handler)
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
