"use client"

import Link from "next/link"
import {
  ArrowLeft,
  Star,
  TrendingUp,
  Zap,
  Shield,
  Crown,
  Target,
  ScrollText,
  Eye,
  Coins,
  MessageCircle,
  Network,
  Snowflake,
  MoonStar,
  Castle,
  Flame,
  Swords,
  Hand,
  Link as LinkIcon
} from "lucide-react"
import { useRouter } from "next/navigation"

const BADGE_ICONS = {
  crown: Hand,
  "scroll-text": ScrollText,
  eye: Eye,
  coins: Coins,
  "message-circle": MessageCircle,
  network: Network,
  snowflake: Snowflake,
  "moon-star": MoonStar,
  shield: Shield,
  castle: Castle,
  chains: LinkIcon,
  throne : Crown,
  flame: Flame,
  swords: Swords,
  star: Star
}

const BADGE_COLOR_STYLES = {
  gold: "text-yellow-300",
  sky: "text-sky-300",
  violet: "text-violet-300",
  emerald: "text-emerald-300",
  cyan: "text-cyan-300",
  indigo: "text-indigo-300",
  teal: "text-teal-300",
  lime: "text-lime-300",
  amber: "text-amber-300",
  orange: "text-orange-300",
  red: "text-red-300",
  fuchsia: "text-fuchsia-300",
  pink: "text-pink-300",
  blue: "text-blue-300"
}

const BADGE_GUIDE = [
  {
    name: "Hand of the King",
    category: "Quality",
    description: "Exceptional, trusted reviews with elite helpfulness.",
    criteria: "Helpfulness ratio >= 0.8 and average review length >= 400",
    icon: "crown",
    color: "gold"
  },
  {
    name: "Maester's Insight",
    category: "Quality",
    description: "Deep analytical reviews with strong structure and depth.",
    criteria: "Average review length >= 500",
    icon: "scroll-text",
    color: "sky"
  },
  {
    name: "Three-Eyed Raven",
    category: "Quality",
    description: "Original perspective across a wide range of titles and genres.",
    criteria: "Reviewed genres >= 10 and average review length >= 300",
    icon: "eye",
    color: "violet"
  },
  {
    name: "Master of Coin",
    category: "Engagement",
    description: "Sustained engagement and strong audience response.",
    criteria: "Total likes >= 100",
    icon: "coins",
    color: "emerald"
  },
  {
    name: "King's Landing Whisperer",
    category: "Engagement",
    description: "Consistently active in thoughtful discussions.",
    criteria: "Comments posted >= 50",
    icon: "message-circle",
    color: "cyan"
  },
  {
    name: "The Spider",
    category: "Engagement",
    description: "Meaningful activity across formats and communities.",
    criteria: "Reviewed genres >= 12 and both movies and TV covered",
    icon: "network",
    color: "indigo"
  },
  {
    name: "The North Remembers",
    category: "Consistency",
    description: "Long-term consistency in quality and activity.",
    criteria: "Reviews written >= 40 and longest streak >= 14",
    icon: "snowflake",
    color: "teal"
  },
  {
    name: "Night's Watch",
    category: "Consistency",
    description: "Reliable day-by-day contribution streak.",
    criteria: "Current streak >= 7",
    icon: "moon-star",
    color: "lime"
  },
  {
    name: "Lord of Winterfell",
    category: "Community",
    description: "Built a successful community with strong participation.",
    criteria: "Community reaches 100 members or sustained discussion",
    icon: "shield",
    color: "amber"
  },
  {
    name: "Warden of the West",
    category: "Community",
    description: "Leads a large and active community.",
    criteria: "Community reaches 500 members",
    icon: "castle",
    color: "orange"
  },
  {
    name: "Breaker of Chains",
    category: "Community",
    description: "Revives dormant threads and restarts discussion.",
    criteria: "Revive inactive discussions multiple times",
    icon: "chains",
    color: "red"
  },
  {
    name: "Iron Throne",
    category: "Viral",
    description: "Top trending content with platform-wide impact.",
    criteria: "Gold-tier trending milestone",
    icon: "throne",
    color: "fuchsia"
  },
  {
    name: "Wildfire",
    category: "Viral",
    description: "Sudden viral growth in engagement.",
    criteria: "Trend factor >= 1.2 in a short window",
    icon: "flame",
    color: "pink"
  },
  {
    name: "Battle of the Bastards",
    category: "Viral",
    description: "High-intensity, high-engagement discussion impact.",
    criteria: "Engagement factor >= 0.9 on discussion content",
    icon: "swords",
    color: "blue"
  }
]

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
              <Crown className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">Possible Badges to Unlock</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Earned badges appear on your profile. Here are the badges you can work toward.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {BADGE_GUIDE.map((badge) => {
                const BadgeIcon = BADGE_ICONS[badge.icon] || Star
                const iconColor = BADGE_COLOR_STYLES[badge.color] || "text-primary"

                return (
                  <article key={badge.name} className="p-4 bg-secondary/10 border border-border rounded-lg space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="h-7 w-7 shrink-0 rounded-full border border-border bg-secondary/30 inline-flex items-center justify-center">
                          <BadgeIcon className={`w-4 h-4 ${iconColor}`} />
                        </span>
                        <h3 className="text-base font-semibold text-foreground">{badge.name}</h3>
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wide text-primary">{badge.category}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                  </article>
                )
              })}
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
