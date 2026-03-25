"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import router from "next/router"

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Button */}
        <button 
          variant="ghost" 
          onClick={() => router.back()}
          className="flex items-center text-sm gap-2 hover:text-primary transition-all active:scale-95 cursor-pointer mb-5"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: March 24, 2026</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Cinnect. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.1 Personal Information You Provide</h3>
            <p className="text-muted-foreground leading-relaxed">
              We collect personal information that you voluntarily provide when you:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
              <li><strong>Register an account:</strong> Name, email address, username, password, and date of birth</li>
              <li><strong>Complete your profile:</strong> Profile picture, bio, and favorite genres</li>
              <li><strong>Use social features:</strong> Reviews, comments, messages, and community posts</li>
              <li><strong>Contact us:</strong> Any information included in your correspondence</li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.2 Information Collected Automatically</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you access the Service, we automatically collect:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
              <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
              <li><strong>Usage Data:</strong> Pages visited, time spent, clicks, and navigation patterns</li>
              <li><strong>IP Address:</strong> For security, analytics, and approximate location</li>
              <li><strong>Cookies:</strong> Small files stored on your device to improve your experience</li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.3 Third-Party Authentication</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you sign in using Google OAuth, we receive:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
              <li>Your Google account email address</li>
              <li>Your name and profile picture (if available)</li>
              <li>A unique identifier for your Google account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
              <li>Create and manage your account</li>
              <li>Provide personalized movie and TV show recommendations</li>
              <li>Enable social features like reviews, comments, and messaging</li>
              <li>Calculate and display achievements, rankings, and gamification features</li>
              <li>Send notifications about activity relevant to you</li>
              <li>Improve and optimize our Service</li>
              <li>Detect, prevent, and address security issues or abuse</li>
              <li>Communicate with you about updates, support, or promotional offers</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may share your information in the following situations:
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.1 Public Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              Certain information is publicly visible on your profile (unless set to private):
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
              <li>Username and profile picture</li>
              <li>Reviews, ratings, and comments</li>
              <li>Community posts and participation</li>
              <li>Followers and following lists</li>
              <li>Achievement badges and level</li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.2 Service Providers</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may share information with third-party vendors who provide services such as:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
              <li>Cloud hosting and storage (database services)</li>
              <li>Image hosting (Cloudinary for profile pictures)</li>
              <li>Email delivery (for notifications and verification)</li>
              <li>Analytics and performance monitoring</li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.3 Legal Requirements</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may disclose information if required by law, legal process, or government request, or to protect our rights, privacy, safety, or property.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate security measures to protect your personal information, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
              <li>Encryption of data in transit (HTTPS)</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>JWT-based authentication tokens</li>
              <li>Rate limiting to prevent abuse</li>
              <li>Regular security reviews and updates</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              However, no method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide you services. We will also retain and use your information as necessary to comply with legal obligations, resolve disputes, and enforce our agreements.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              If you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Your Privacy Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Restriction:</strong> Limit how we use your data</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us at the email address below or use the settings in your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-4 space-y-2">
              <li><strong>Essential Cookies:</strong> Necessary for the Service to function (authentication, preferences)</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our Service</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You can control cookies through your browser settings. Disabling certain cookies may limit your ability to use some features of our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Users between 13 and 18 may use the Service with parental consent and may have restricted access to adult content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. These countries may have different data protection laws. By using our Service, you consent to such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically.
            </p>
          </section>

          {/* <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-primary">Email: privacy@cinnect.com</p>
              <p className="text-primary">Support: support@cinnect.com</p>
            </div>
          </section> */}
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4">
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
          <span className="text-muted-foreground">|</span>
          <Link href="/" className="text-primary hover:underline">
            Home
          </Link>
        </div>
      </div>
    </main>
  )
}
