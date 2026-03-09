// Email Service for sending OTPs
import nodemailer from 'nodemailer';

/**
 * Base email styles matching the website's exact UI
 * Colors: background #0a0a0a, card #1f1f1f, primary #d4a520, border #333, muted #b3b3b3
 */
const getBaseStyles = () => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    line-height: 1.5; 
    background-color: #0a0a0a;
    color: #f2f2f2;
    padding: 32px 16px;
    -webkit-font-smoothing: antialiased;
  }
  .email-wrapper {
    max-width: 480px;
    margin: 0 auto;
  }
  /* Logo Section - matches website header */
  .logo-section {
    text-align: center;
    margin-bottom: 32px;
  }
  .logo-icon {
    width: 64px;
    height: 64px;
    background-color: #d4a520;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }
  .logo-icon span {
    font-size: 32px;
  }
  .logo-title {
    font-size: 30px;
    font-weight: 700;
    color: #f2f2f2;
    margin-bottom: 8px;
  }
  .logo-subtitle {
    color: #b3b3b3;
    font-size: 14px;
  }
  /* Card - matches bg-card border border-border rounded-lg p-8 shadow-lg */
  .card {
    background-color: #1f1f1f;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 32px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2);
  }
  /* Typography */
  .heading {
    font-size: 24px;
    font-weight: 600;
    color: #f2f2f2;
    margin-bottom: 8px;
  }
  .text {
    color: #b3b3b3;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 24px;
  }
  .text-sm {
    font-size: 12px;
    color: #888;
  }
  .text-primary {
    color: #d4a520;
  }
  /* Primary Button - matches bg-primary text-primary-foreground rounded-md h-9 px-4 */
  .btn-primary {
    display: inline-block;
    background-color: #d4a520;
    color: #0a0a0a;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    padding: 10px 16px;
    border-radius: 6px;
    text-align: center;
    transition: background-color 0.2s;
  }
  .btn-primary:hover {
    background-color: #c49a1d;
  }
  .btn-primary-lg {
    padding: 12px 24px;
    font-size: 14px;
    width: 100%;
    display: block;
  }
  /* Outline Button - matches variant outline */
  .btn-outline {
    display: inline-block;
    background-color: transparent;
    color: #f2f2f2;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    padding: 10px 16px;
    border-radius: 6px;
    border: 1px solid #333;
    text-align: center;
  }
  /* Input box style - matches website inputs */
  .input-display {
    background-color: #262626;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 12px 16px;
    color: #f2f2f2;
    font-size: 14px;
  }
  /* OTP Code Display */
  .otp-container {
    background-color: #262626;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 24px;
    text-align: center;
    margin: 24px 0;
  }
  .otp-label {
    font-size: 12px;
    color: #b3b3b3;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }
  .otp-code {
    font-size: 36px;
    font-weight: 700;
    color: #d4a520;
    letter-spacing: 8px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', monospace;
  }
  .otp-expiry {
    font-size: 12px;
    color: #888;
    margin-top: 12px;
  }
  /* Alert boxes - matches website alert styles */
  .alert {
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    margin: 16px 0;
  }
  .alert-warning {
    background-color: rgba(212, 165, 32, 0.1);
    border: 1px solid #d4a520;
    color: #d4a520;
  }
  .alert-info {
    background-color: rgba(179, 179, 179, 0.1);
    border: 1px solid #333;
    color: #b3b3b3;
  }
  .alert-title {
    font-weight: 600;
    margin-bottom: 4px;
  }
  .alert ul {
    margin: 8px 0 0 16px;
    padding: 0;
  }
  .alert li {
    margin: 4px 0;
    font-size: 13px;
  }
  /* Feature list - matches website feature cards */
  .feature-item {
    background-color: rgba(212, 165, 32, 0.05);
    border-left: 3px solid #d4a520;
    padding: 12px 16px;
    margin: 12px 0;
    border-radius: 0 6px 6px 0;
  }
  .feature-title {
    color: #d4a520;
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 4px;
  }
  .feature-desc {
    color: #b3b3b3;
    font-size: 13px;
  }
  /* Points box */
  .points-box {
    background-color: #262626;
    border: 1px solid #d4a520;
    border-radius: 8px;
    padding: 24px;
    text-align: center;
    margin: 24px 0;
  }
  .points-number {
    font-size: 48px;
    font-weight: 700;
    color: #d4a520;
    line-height: 1;
  }
  .points-label {
    font-size: 12px;
    color: #b3b3b3;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 8px;
  }
  /* Divider */
  .divider {
    border: none;
    border-top: 1px solid #333;
    margin: 24px 0;
  }
  /* Footer */
  .footer {
    text-align: center;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid #333;
  }
  .footer-text {
    color: #666;
    font-size: 12px;
    margin: 4px 0;
  }
  .footer-link {
    color: #d4a520;
    text-decoration: none;
  }
  /* Link display box */
  .link-box {
    background-color: #262626;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 12px;
    margin-top: 16px;
    word-break: break-all;
  }
  .link-label {
    font-size: 11px;
    color: #888;
    margin-bottom: 6px;
  }
  .link-url {
    font-size: 12px;
    color: #d4a520;
    word-break: break-all;
  }
  /* Signature */
  .signature {
    text-align: center;
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid #333;
  }
  .signature-text {
    color: #b3b3b3;
    font-size: 14px;
  }
  .signature-name {
    color: #d4a520;
    font-weight: 600;
    font-size: 14px;
    margin-top: 4px;
  }
`;

/**
 * Send OTP via Email
 * @param {string} email - Email address
 * @param {string} otp - OTP code
 * @param {string} userName - User's name
 * @returns {Promise<boolean>} - Success status
 */
export const sendOTPEmail = async (email, otp, userName = 'User') => {
  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });

        const mailOptions = {
          from: `"Cinnect" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Your Cinnect Verification Code',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${getBaseStyles()}</style>
            </head>
            <body>
              <div class="email-wrapper">
                <!-- Logo Section -->
                <div class="logo-section">
                  <div class="logo-icon"><span>C</span></div>
                  <div class="logo-title">Verification Code</div>
                  <div class="logo-subtitle">Verify your email to continue to Cinnect</div>
                </div>

                <!-- Main Card -->
                <div class="card">
                  <div class="text">
                    Hello <strong style="color: #f2f2f2;">${userName}</strong>,
                  </div>
                  <div class="text">
                    Welcome to Cinnect! Use the verification code below to complete your registration:
                  </div>

                  <!-- OTP Display -->
                  <div class="otp-container">
                    <div class="otp-label">Your Verification Code</div>
                    <div class="otp-code">${otp}</div>
                    <div class="otp-expiry">Valid for 10 minutes</div>
                  </div>

                  <!-- Warning Alert -->
                  <div class="alert alert-warning">
                    <div class="alert-title">Security Notice</div>
                    <ul>
                      <li>Never share this code with anyone</li>
                      <li>Cinnect will never ask for your code</li>
                      <li>This code expires in 10 minutes</li>
                    </ul>
                  </div>

                  <div class="text-sm" style="margin-top: 16px;">
                    If you didn't request this code, please ignore this email.
                  </div>

                  <!-- Signature -->
                  <div class="signature">
                    <div class="signature-text">Happy watching!</div>
                    <div class="signature-name">The Cinnect Team</div>
                  </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                  <div class="footer-text">© ${new Date().getFullYear()} Cinnect. All rights reserved.</div>
                  <div class="footer-text">This is an automated message, please do not reply.</div>
                </div>
              </div>
            </body>
            </html>
          `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[OK] Email sent successfully to ${email}`);
        console.log(`[EMAIL] Message ID: ${info.messageId}`);
        return true;

      } catch (emailError) {
        console.error('[ERROR] Email Error:', emailError.message);
        return false;
      }
    }

    return true;

  } catch (error) {
    console.error('Email Service Error:', error);
    return false;
  }
};

/**
 * Send welcome email after successful registration
 * @param {string} email - Email address
 * @param {string} userName - User's name
 * @returns {Promise<boolean>} - Success status
 */
export const sendWelcomeEmail = async (email, userName) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return true;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

    const mailOptions = {
      from: `"Cinnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Cinnect - 50 Points Bonus!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${getBaseStyles()}</style>
        </head>
        <body>
          <div class="email-wrapper">
            <!-- Logo Section -->
            <div class="logo-section">
              <div class="logo-icon"><span>C</span></div>
              <div class="logo-title">Welcome to Cinnect!</div>
              <div class="logo-subtitle">Your movie community awaits</div>
            </div>

            <!-- Main Card -->
            <div class="card">
              <div class="text">
                Hello <strong style="color: #f2f2f2;">${userName}</strong>,
              </div>
              <div class="text">
                Your account has been successfully created. We're thrilled to have you join the Cinnect community!
              </div>

              <!-- Points Box -->
              <div class="points-box">
                <div class="points-label" style="margin-bottom: 8px;">Welcome Bonus</div>
                <div class="points-number">50</div>
                <div class="points-label">POINTS CREDITED</div>
              </div>

              <div class="text" style="margin-bottom: 16px;">
                <strong style="color: #f2f2f2;">What you can do now:</strong>
              </div>

              <!-- Feature Items -->
              <div class="feature-item">
                <div class="feature-title">Discover Movies</div>
                <div class="feature-desc">Browse thousands of movies and find your next favorite</div>
              </div>

              <div class="feature-item">
                <div class="feature-title">Write Reviews</div>
                <div class="feature-desc">Share your thoughts and earn more points</div>
              </div>

              <div class="feature-item">
                <div class="feature-title">Create Watchlists</div>
                <div class="feature-desc">Keep track of movies you want to watch</div>
              </div>

              <div class="feature-item">
                <div class="feature-title">Earn Points & Level Up</div>
                <div class="feature-desc">Get rewarded for your contributions</div>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 32px;">
                <a href="${appUrl}" class="btn-primary btn-primary-lg">
                  Start Exploring
                </a>
              </div>

              <!-- Signature -->
              <div class="signature">
                <div class="signature-text">Happy watching!</div>
                <div class="signature-name">The Cinnect Team</div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-text">© ${new Date().getFullYear()} Cinnect. All rights reserved.</div>
              <div class="footer-text">This is an automated message, please do not reply.</div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[OK] Welcome email sent to ${email}`);
    return true;

  } catch (error) {
    console.error('Welcome email error:', error);
    return false;
  }
};

/**
 * Send Password Reset Email
 * @param {string} email - Email address
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name
 * @returns {Promise<boolean>} - Success status
 */
export const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });

        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        const mailOptions = {
          from: `"Cinnect" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Reset Your Cinnect Password',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${getBaseStyles()}</style>
            </head>
            <body>
              <div class="email-wrapper">
                <!-- Logo Section -->
                <div class="logo-section">
                  <div class="logo-icon"><span>C</span></div>
                  <div class="logo-title" style="color: #141414;">Reset Password</div>
                  <div class="logo-subtitle " style="color: #141414;">Create a new password for your Cinnect account</div>
                </div>

                <!-- Main Card -->
                <div class="card">
                  <div class="text">
                    Hello <strong style="color: #f2f2f2;">${userName}</strong>,
                  </div>
                  <div class="text">
                    We received a request to reset your Cinnect password. Click the button below to create a new password:
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${resetUrl}" class="btn-primary btn-primary-lg">
                      Reset Password
                    </a>
                  </div>

                  <!-- Info Alert -->
                  <div class="alert alert-info">
                    <div class="alert-title">Important</div>
                    <div>This password reset link will expire in 1 hour for security reasons.</div>
                  </div>

                  <!-- Warning Alert -->
                  <div class="alert alert-warning">
                    <div class="alert-title">Security Notice</div>
                    <ul>
                      <li>If you didn't request this, ignore this email</li>
                      <li>Never share this link with anyone</li>
                      <li>Cinnect will never ask for your password</li>
                    </ul>
                  </div>

                  <!-- Link Box -->
                  <div class="link-box">
                    <div class="link-label">If the button doesn't work, copy and paste this link:</div>
                    <div class="link-url">${resetUrl}</div>
                  </div>

                  <!-- Signature -->
                  <div class="signature">
                    <div class="signature-text">Stay secure!</div>
                    <div class="signature-name">The Cinnect Team</div>
                  </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                  <div class="footer-text">© ${new Date().getFullYear()} Cinnect. All rights reserved.</div>
                  <div class="footer-text">This is an automated message, please do not reply.</div>
                </div>
              </div>
            </body>
            </html>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[OK] Password reset email sent to ${email}`);
        return true;

      } catch (error) {
        console.error('Password reset email error:', error);
        return false;
      }
    }

    console.log('[WARN] Email service not configured');
    return false;

  } catch (error) {
    console.error('Password reset email error:', error);
    return false;
  }
};
