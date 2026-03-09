/**
 * Shared in-memory store for pending OTP registrations.
 * Both /api/users/register and /api/users/complete-registration import from here
 * so they always reference the same Map instance within the same Node.js process.
 *
 * Note: In production, replace this with Redis or another persistent store
 * to support multi-instance deployments.
 */

const pendingRegistrations = globalThis.__pendingRegistrations ??
  (globalThis.__pendingRegistrations = new Map())

export default pendingRegistrations
