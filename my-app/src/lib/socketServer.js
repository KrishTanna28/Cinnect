/**
 * Server-side utility to emit Socket.IO events from API routes.
 * The `io` instance is set by `server.js` on `globalThis._io`.
 */

/**
 * Get the global Socket.IO server instance.
 * Returns null if not running under the custom server (e.g. during build).
 */
export function getIO() {
  return globalThis._io || null
}

/**
 * Emit a notification event to a specific user.
 * @param {string} recipientId - The user's MongoDB _id
 * @param {object} notification - The notification document (lean or toObject)
 */
export function emitNotification(recipientId, notification) {
  const io = getIO()
  if (!io) return
  io.to(`user:${recipientId.toString()}`).emit('notification:new', notification)
}
