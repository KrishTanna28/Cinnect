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
    if (!response.ok) {
      console.error('[SOCKET] HTTP emit failed:', response.status)
    }
    return response.ok
  } catch (error) {
    console.error('[SOCKET] Failed to emit via HTTP:', error.message)
    return false
  }
}

/**
 * Generic emit function - emits to a user room with any event.
 * @param {string} userId - The user's MongoDB _id
 * @param {string} event - The event name
 * @param {object} data - The data to send
 */
export async function emitToUser(userId, event, data) {
  const io = getIO()
  const room = `user:${userId.toString()}`

  if (io) {
    io.to(room).emit(event, data)
  } else {
    await emitViaHttp(room, event, data)
  }
}

/**
 * Emit a notification event to a specific user.
 * @param {string} recipientId - The user's MongoDB _id
 * @param {object} notification - The notification document
 */
export async function emitNotification(recipientId, notification) {
  await emitToUser(recipientId, 'notification:new', notification)
}

/**
 * Emit a new message event to a specific user.
 * @param {string} recipientId - The user's MongoDB _id
 * @param {object} messagePayload - The message payload
 */
export async function emitMessage(recipientId, messagePayload) {
  await emitToUser(recipientId, 'message:new', messagePayload)
}

/**
 * Emit conversation update to a specific user.
 * @param {string} userId - The user's MongoDB _id
 * @param {object} conversation - The conversation data
 */
export async function emitConversationUpdate(userId, conversation) {
  await emitToUser(userId, 'conversation:update', conversation)
}

/**
 * Emit messages read event to a specific user.
 * @param {string} userId - The user's MongoDB _id
 * @param {object} data - { conversationId, userId }
 */
export async function emitMessagesRead(userId, data) {
  await emitToUser(userId, 'messages:read', data)
}

/**
 * Emit conversation delete event to a specific user.
 * @param {string} userId - The user's MongoDB _id
 * @param {object} data - { conversationId }
 */
export async function emitConversationDelete(userId, data) {
  await emitToUser(userId, 'conversation:delete', data)
}

/**
 * Emit unread count update to a specific user.
 * @param {string} userId - The user's MongoDB _id
 * @param {number} count - The unread count
 */
export async function emitUnreadCount(userId, count) {
  await emitToUser(userId, 'unread-count:update', { count })
}

/**
 * Emit message reaction update to a specific user.
 * @param {string} userId - The user's MongoDB _id
 * @param {object} data - { conversationId, messageId, reactions }
 */
export async function emitMessageReaction(userId, data) {
  await emitToUser(userId, 'message:react', data)
}
