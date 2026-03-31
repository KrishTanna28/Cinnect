import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { startNotificationScheduler } from './src/lib/services/notificationScheduler.js'

dotenv.config({ path: '.env' })

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT, 10) || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // Attach Socket.IO to the HTTP server
  const io = new SocketIOServer(server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  // Store io instance globally so API routes can access it
  globalThis._io = io

  const getTokenFromCookieHeader = (cookieHeader = '') => {
    return cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('auth_token='))
      ?.split('=')[1] || null
  }

  // Authentication middleware – verify JWT and join user-specific room
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || getTokenFromCookieHeader(socket.handshake.headers?.cookie)
    if (!token) {
      return next(new Error('Authentication required'))
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.userId || decoded.id
      next()
    } catch (err) {
      return next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.userId
    if (userId) {
      // Join a room named after the user's ID for targeted notifications
      socket.join(`user:${userId}`)
      console.log(`🔌 Socket connected: user ${userId} (${socket.id})`)
    }

    // Handle typing indicator
    socket.on('typing:start', (data) => {
      socket.to(`user:${data.recipientId}`).emit('typing:start', {
        conversationId: data.conversationId,
        userId
      })
    })

    socket.on('typing:stop', (data) => {
      socket.to(`user:${data.recipientId}`).emit('typing:stop', {
        conversationId: data.conversationId,
        userId
      })
    })

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: user ${userId} (${reason})`)
    })
  })

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    // Start the background entertainment notification scheduler
    startNotificationScheduler(port)
  })
})
