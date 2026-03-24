import { withAuth } from '@/lib/middleware/withAuth.js'
import { getProgressionSnapshot } from '@/lib/utils/gamification.js'
import connectDB from '@/lib/config/database.js'
import { success, error, handleError } from '@/lib/utils/apiResponse.js'

// GET /api/users/me - Get current user profile
export const GET = withAuth(async (request, { user }) => {
  try {
    await connectDB()
    return success({
      ...user.toObject(),
      progression: getProgressionSnapshot(user)
    })
  } catch (err) {
    return handleError(err, 'Get profile')
  }
})

// PATCH /api/users/me - Update current user profile
export const PATCH = withAuth(async (request, { user }) => {
  try {
    await connectDB()
    const formData = await request.formData()
    const fullName = formData.get('fullName')
    const bio = formData.get('bio')
    const avatarFile = formData.get('avatar')
    const favoriteGenresRaw = formData.get('favoriteGenres')
    const dateOfBirth = formData.get('dateOfBirth')

    // Validate bio length
    if (bio !== null && bio !== undefined && bio.length > 500) {
      return error('Bio must be under 500 characters', 400)
    }

    // Validate name length
    if (fullName !== null && fullName !== undefined && fullName.length > 50) {
      return error('Name must be under 50 characters', 400)
    }

    // Update allowed fields (use !== null so empty strings can clear fields)
    if (fullName !== null && fullName !== undefined) user.fullName = fullName
    if (bio !== null && bio !== undefined) user.bio = bio

    // Update date of birth
    if (dateOfBirth !== null && dateOfBirth !== undefined) {
      if (dateOfBirth === '') {
        user.dateOfBirth = null
      } else {
        const parsedDate = new Date(dateOfBirth)
        if (!isNaN(parsedDate.getTime())) {
          user.dateOfBirth = parsedDate
        }
      }
    }

    // Handle favorite genres
    if (favoriteGenresRaw !== null && favoriteGenresRaw !== undefined) {
      try {
        const genres = JSON.parse(favoriteGenresRaw)
        if (Array.isArray(genres)) {
          if (!user.preferences) user.preferences = {}
          user.preferences.favoriteGenres = genres
          user.markModified('preferences.favoriteGenres')
        }
      } catch {
        // Ignore invalid JSON for genres
      }
    }

    // Handle avatar removal
    const removeAvatar = formData.get('removeAvatar')
    if (removeAvatar === 'true') {
      user.avatar = null
      user.markModified('avatar')
    }

    // Handle avatar upload if provided
    if (!removeAvatar && avatarFile && typeof avatarFile !== 'string' && avatarFile.size > 0) {
      // Validate file size (5MB limit)
      if (avatarFile.size > 5 * 1024 * 1024) {
        return error('Avatar image must be under 5MB', 400)
      }

      try {
        const { uploadAvatarToCloudinary } = await import('@/lib/utils/cloudinaryHelper.js')
        const avatarBuffer = Buffer.from(await avatarFile.arrayBuffer())
        const avatarUrl = await uploadAvatarToCloudinary(avatarBuffer, avatarFile.name, user._id.toString())
        user.avatar = avatarUrl
      } catch (uploadError) {
        console.error('Avatar upload failed:', uploadError)
        return error('Failed to upload avatar image. Please try again.', 500)
      }
    }

    await user.save()

    return success({
      ...user.toObject(),
      progression: getProgressionSnapshot(user)
    }, 'Profile updated successfully')
  } catch (err) {
    return handleError(err, 'Update profile')
  }
})
