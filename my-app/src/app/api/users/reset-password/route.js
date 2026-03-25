import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/config/database';
import User from '@/lib/models/User';

/**
 * POST /api/users/reset-password
 * Reset user password with valid token
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Validate input
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Hash the token from URL to compare with stored hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Token not expired
    }).select('+resetPasswordToken +resetPasswordExpires +password');

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired reset token. Please request a new password reset.',
        },
        { status: 400 }
      );
    }

    // Update user password and clear reset token fields
    // Note: Password will be hashed by the pre-save middleware in User model
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.loginAttempts = 0; // Reset login attempts
    user.lockUntil = undefined; // Clear any account lock

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.',
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while resetting your password. Please try again.',
      },
      { status: 500 }
    );
  }
}
