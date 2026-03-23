import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/lib/models/User.js';
import connectDB from '@/lib/config/database.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${FRONTEND_URL}/login?error=oauth_denied`);
    }

    if (!code) {
      return NextResponse.redirect(`${FRONTEND_URL}/login?error=no_code`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    const { access_token } = tokens;

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info');
      return NextResponse.redirect(`${FRONTEND_URL}/login?error=user_info_failed`);
    }

    const googleUser = await userInfoResponse.json();

    // Connect to database
    await connectDB();

    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: googleUser.id });

    if (user) {
      // User exists, generate token
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

      // Redirect to auth callback page with token and full user data
      const userResponse = user.toObject();
      delete userResponse.password; // Remove password field if present
      const userStr = encodeURIComponent(JSON.stringify(userResponse));

      return NextResponse.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${userStr}`);
    }

    // Check if user exists with this email (from regular registration)
    user = await User.findOne({ email: googleUser.email });

    if (user) {
      // Link Google account to existing user
      user.googleId = googleUser.id;
      user.authProvider = 'google';
      user.emailVerified = true;
      
      // Update avatar if not set
      if (!user.avatar || user.avatar === 'https://via.placeholder.com/150') {
        user.avatar = googleUser.picture || user.avatar;
      }
      
      await user.save();

      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

      // Return full user data
      const userResponse = user.toObject();
      delete userResponse.password; // Remove password field if present
      const userStr = encodeURIComponent(JSON.stringify(userResponse));

      return NextResponse.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${userStr}`);
    }

    // Create new user
    const username = googleUser.email.split('@')[0] + Math.floor(Math.random() * 1000);
    
    user = await User.create({
      googleId: googleUser.id,
      email: googleUser.email,
      username: username,
      fullName: googleUser.name,
      avatar: googleUser.picture || 'https://via.placeholder.com/150',
      authProvider: 'google',
      emailVerified: true,
    });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Return full user data
    const userResponse = user.toObject();
    delete userResponse.password; // Remove password field if present
    const userStr = encodeURIComponent(JSON.stringify(userResponse));

    return NextResponse.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${userStr}`);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(`${FRONTEND_URL}/login?error=oauth_callback_failed`);
  }
}
