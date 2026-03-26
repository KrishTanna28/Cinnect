"use client"

import Link from "next/link"
import { ArrowLeft, Star, TrendingUp, Zap, Shield, Crown, Target } from "lucide-react"
import { useRouter } from "next/navigation"

export default function RatingSystemPage() {
  const router = useRouter()

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
          <h1 className="text-4xl font-bold text-foreground mb-4">Rating & Points System</h1>
          <p className="text-muted-foreground">Understanding how you earn experience, level up, and unlock badges</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">Overview</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Cinnect has two progress metrics: XP and Global Rank. XP tracks your long-term activity and always increases. Global Rank compares your recent performance with other users and can move up or down.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">How Rating Is Calculated</h2>
            </div>
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li><strong>Quality first:</strong> Clear, useful, and original reviews get more weight.</li>
                <li><strong>Engagement matters:</strong> Likes, replies, and meaningful interaction improve your score.</li>
                <li><strong>Consistency helps:</strong> Regular quality contributions are rewarded over one-time spikes.</li>
                <li><strong>Spam control:</strong> Repetitive or low-value actions get reduced returns.</li>
                <li><strong>Moderation impact:</strong> Flagged content may receive partial or zero points.</li>
              </ul>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">How You Earn XP</h2>
            </div>

            <div className="mt-4 space-y-3">
              <div className="border border-border rounded-lg p-4 bg-secondary/10 flex items-center justify-between">
                <span className="font-semibold text-foreground">Writing a review</span>
                <span className="text-sm font-bold text-primary">20 XP base</span>
              </div>
              <div className="border border-border rounded-lg p-4 bg-secondary/10 flex items-center justify-between">
                <span className="font-semibold text-foreground">Like on your review</span>
                <span className="text-sm font-bold text-primary">2 XP base</span>
              </div>
              <div className="border border-border rounded-lg p-4 bg-secondary/10 flex items-center justify-between">
                <span className="font-semibold text-foreground">Posting a comment</span>
                <span className="text-sm font-bold text-primary">5 XP base</span>
              </div>
              <div className="border border-border rounded-lg p-4 bg-secondary/10 flex items-center justify-between">
                <span className="font-semibold text-foreground">Posting a reply</span>
                <span className="text-sm font-bold text-primary">3 XP base</span>
              </div>
              <div className="border border-border rounded-lg p-4 bg-secondary/10 flex items-center justify-between">
                <span className="font-semibold text-foreground">Daily login</span>
                <span className="text-sm font-bold text-primary">2 XP</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Final XP can vary based on quality, engagement, badges, and daily limits.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">Level vs Global Rank</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-secondary/10 border border-border rounded-lg">
                <h3 className="text-lg font-medium text-foreground mb-2">Level (XP)</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Based on total XP earned</li>
                  <li>Only moves upward</li>
                  <li>Represents your overall journey</li>
                </ul>
              </div>
              <div className="p-4 bg-secondary/10 border border-border rounded-lg">
                <h3 className="text-lg font-medium text-foreground mb-2">Global Rank</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Based on relative performance</li>
                  <li>Can increase or decrease</li>
                  <li>Represents your current standing</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">Ranking Titles</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10"><span className="font-semibold text-foreground">Rank #1</span><span className="text-primary font-bold">King</span></div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10"><span className="font-semibold text-foreground">Rank #2-10</span><span className="text-primary font-bold">Hand of the King</span></div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10"><span className="font-semibold text-foreground">Rank #11-50</span><span className="text-primary font-bold">Small Council Elite</span></div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10"><span className="font-semibold text-foreground">Rank #51-200</span><span className="text-primary font-bold">Kingsguard</span></div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10"><span className="font-semibold text-foreground">Rank #201-1,000</span><span className="text-primary font-bold">Warden</span></div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10"><span className="font-semibold text-foreground">Rank #1,001-5,000</span><span className="text-primary font-bold">Lord</span></div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10"><span className="font-semibold text-foreground">Rank #5,001-20,000</span><span className="text-primary font-bold">Bannermen</span></div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10"><span className="font-semibold text-foreground">Rank #20,001-100,000</span><span className="text-primary font-bold">Knight</span></div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10"><span className="font-semibold text-foreground">Rank #100,001+</span><span className="text-primary font-bold">Smallfolk</span></div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">Good Practices</h2>
            </div>
            <div className="p-4 bg-secondary/10 border border-border rounded-lg">
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>Write clear and specific reviews instead of one-line feedback.</li>
                <li>Engage respectfully with other users through comments and replies.</li>
                <li>Stay consistent; regular quality activity improves long-term growth.</li>
                <li>Avoid spam, copied text, and artificial engagement.</li>
              </ul>
            </div>
          </section>

        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4">
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          <span className="text-muted-foreground">|</span>
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
