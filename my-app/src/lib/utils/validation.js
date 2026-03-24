import { z } from 'zod'
import { error } from './apiResponse.js'

/**
 * Validation Schemas for critical API routes
 * Uses Zod for runtime validation
 */

// Common validators
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format')
const email = z.string().email('Please enter a valid email address')
const password = z.string().min(8, 'Password must be at least 8 characters')
const username = z.string().min(3, 'Username must be at least 3 characters').max(30)

// Auth schemas
export const loginSchema = z.object({
  email: email,
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  email: email,
  password: password,
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  username: username.optional(),
})

export const completeRegistrationSchema = z.object({
  email: email,
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

export const forgotPasswordSchema = z.object({
  email: email,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: password,
})

// User schemas
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  username: username.optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional().nullable(),
  banner: z.string().url().optional().nullable(),
  dateOfBirth: z.string().optional(),
  isPrivate: z.boolean().optional(),
}).partial()

export const updateSettingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    newFollower: z.boolean().optional(),
    reviewLike: z.boolean().optional(),
    newReply: z.boolean().optional(),
    friendActivity: z.boolean().optional(),
    recommendations: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    showActivity: z.boolean().optional(),
    showWatchlist: z.boolean().optional(),
    showFavorites: z.boolean().optional(),
    showStats: z.boolean().optional(),
  }).optional(),
  content: z.object({
    adultContent: z.boolean().optional(),
    autoplayTrailers: z.boolean().optional(),
    defaultQuality: z.enum(['auto', '720p', '1080p', '4k']).optional(),
  }).optional(),
}).partial()

// Review schemas
export const createReviewSchema = z.object({
  mediaId: z.union([z.string(), z.number()]).transform(val => String(val)),
  mediaType: z.enum(['movie', 'tv']),
  rating: z.number().min(0.5).max(5),
  content: z.string().max(5000).optional(),
  containsSpoilers: z.boolean().optional(),
})

export const updateReviewSchema = z.object({
  rating: z.number().min(0.5).max(5).optional(),
  content: z.string().max(5000).optional(),
  containsSpoilers: z.boolean().optional(),
}).partial()

export const replySchema = z.object({
  content: z.string().min(1, 'Reply cannot be empty').max(2000),
})

// Message schemas
export const sendMessageSchema = z.object({
  recipientId: objectId.optional(),
  content: z.string().min(1, 'Message cannot be empty').max(5000),
  replyToId: objectId.optional(),
})

export const createConversationSchema = z.object({
  recipientId: objectId,
  message: z.string().min(1).max(5000).optional(),
})

// Community schemas
export const createCommunitySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(1000).optional(),
  rules: z.string().max(5000).optional(),
  isPrivate: z.boolean().optional(),
  tags: z.array(z.string()).max(10).optional(),
})

export const updateCommunitySchema = createCommunitySchema.partial()

export const createPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  content: z.string().min(1, 'Content is required').max(10000),
  mediaId: z.string().optional(),
  mediaType: z.enum(['movie', 'tv']).optional(),
  containsSpoilers: z.boolean().optional(),
  tags: z.array(z.string()).max(5).optional(),
})

export const updatePostSchema = createPostSchema.partial()

export const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
  parentId: objectId.optional(),
})

// AI assistant schemas
export const aiAssistantSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000),
  context: z.object({
    mediaId: z.string().optional(),
    mediaType: z.enum(['movie', 'tv']).optional(),
    mediaTitle: z.string().optional(),
  }).optional(),
})

// Watchlist/favorites schemas
export const watchlistItemSchema = z.object({
  mediaId: z.union([z.string(), z.number()]).transform(val => String(val)),
  mediaType: z.enum(['movie', 'tv']),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

export const watchedItemSchema = z.object({
  mediaId: z.union([z.string(), z.number()]).transform(val => String(val)),
  mediaType: z.enum(['movie', 'tv']),
  rating: z.number().min(0).max(5).optional(),
})

export const favoriteItemSchema = z.object({
  mediaId: z.union([z.string(), z.number()]).transform(val => String(val)),
  mediaType: z.enum(['movie', 'tv']),
})

/**
 * Validate request body against a schema
 * Returns { success: true, data } if valid
 * Returns { success: false, response } if invalid
 */
export function validate(schema, data) {
  const result = schema.safeParse(data)

  if (!result.success) {
    // Extract the first error message for user-friendly display
    const firstError = result.error.errors[0]
    const message = firstError?.message || 'Please check your input'

    return {
      success: false,
      response: error(message, 400),
      errors: result.error.errors,
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

/**
 * Higher-order function to wrap API handler with validation
 * Usage: export const POST = withValidation(createReviewSchema, async (request, { body }) => { ... })
 */
export function withValidation(schema, handler) {
  return async (request, context) => {
    try {
      const body = await request.json()
      const result = validate(schema, body)

      if (!result.success) {
        return result.response
      }

      // Add validated data to context
      return handler(request, { ...context, body: result.data })
    } catch (err) {
      if (err instanceof SyntaxError) {
        return error('Invalid request body', 400)
      }
      throw err
    }
  }
}

/**
 * Validate query parameters
 */
export function validateQuery(schema, searchParams) {
  // Convert URLSearchParams to object
  const params = {}
  for (const [key, value] of searchParams.entries()) {
    params[key] = value
  }

  return validate(schema, params)
}
