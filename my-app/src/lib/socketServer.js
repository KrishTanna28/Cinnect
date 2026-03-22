/**
 * Server-side utility to emit Socket.IO events from API routes.
 *
 * In development with custom server: Uses `globalThis._io` directly.
 * In production (Vercel): Sends HTTP request to external socket server.
 */

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL
const SOCKET_API_KEY = process.env.SOCKET_INTERNAL_API_KEY

/**
 * Get the global Socket.IO server instance (only works with custom server).
 * Returns null if running on Vercel or during build.
 */
export function getIO() {
  return globalThis._io || null
}

/**
 * Emit an event to a specific room via the external socket server.
 * @param {string} room - The room to emit to (e.g., `user:${userId}`)
 * @param {string} event - The event name
 * @param {object} data - The data to send
 */
async function emitViaHttp(room, event, data) {
  if (!SOCKET_SERVER_URL || !SOCKET_API_KEY) {
    console.warn('[SOCKET] External socket server not configured')
    return false
  }

  try {
    const response = await fetch(`${SOCKET_SERVER_URL}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SOCKET_API_KEY,
      },
      body: JSON.stringify({ room, event, data }),
    })
    return response.ok
  } catch (error) {
    console.error('[SOCKET] Failed to emit via HTTP:', error.message)
    return false
  }
}

/**
 * Emit a notification event to a specific user.
 * Uses direct Socket.IO if available, otherwise HTTP to external server.
 * @param {string} recipientId - The user's MongoDB _id
 * @param {object} notification - The notification document (lean or toObject)
 */
export async function emitNotification(recipientId, notification) {
  const io = getIO()
  const room = `user:${recipientId.toString()}`

  if (io) {
    // Direct emit via local Socket.IO server
    io.to(room).emit('notification:new', notification)
  } else {
    // Emit via HTTP to external socket server
    await emitViaHttp(room, 'notification:new', notification)
  }
}

/**
 * Emit a message event to a specific user.
 * @param {string} recipientId - The user's MongoDB _id
 * @param {object} message - The message data
 */
export async function emitMessage(recipientId, message) {
  const io = getIO()
  const room = `user:${recipientId.toString()}`

  if (io) {
    io.to(room).emit('message:new', message)
  } else {
    await emitViaHttp(room, 'message:new', message)
  }
}
