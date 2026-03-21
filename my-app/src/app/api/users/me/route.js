import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth.js'
import { getProgressionSnapshot } from '@/lib/utils/gamification.js'

// GET /api/users/me - Get current user profile
export const GET = withAuth(async (request, { user }) => {
  try {
    return NextResponse.json({
      success: true,
      data: {
        ...user.toObject(),
        progression: getProgressionSnapshot(user)
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to get profile'
      },
      { status: 500 }
    )
  }
})

// PATCH /api/users/me - Update current user profile
export const PATCH = withAuth(async (request, { user }) => {
  try {
    const formData = await request.formData()
    const fullName = formData.get('fullName')
    const bio = formData.get('bio')
    const avatarFile = formData.get('avatar')
    const favoriteGenresRaw = formData.get('favoriteGenres')
    const dateOfBirth = formData.get('dateOfBirth')

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
      try {
        const { uploadAvatarToCloudinary } = await import('@/lib/utils/cloudinaryHelper.js')
        const avatarBuffer = Buffer.from(await avatarFile.arrayBuffer())
        const avatarUrl = await uploadAvatarToCloudinary(avatarBuffer, avatarFile.name, user._id.toString())
        user.avatar = avatarUrl
      } catch (uploadError) {
        console.error('Avatar upload failed:', uploadError)
        return NextResponse.json(
          { success: false, message: 'Failed to upload avatar image' },
          { status: 500 }
        )
      }
    }

    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        ...user.toObject(),
        progression: getProgressionSnapshot(user)
      }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to update profile'
      },
      { status: 500 }
    )
  }
})
