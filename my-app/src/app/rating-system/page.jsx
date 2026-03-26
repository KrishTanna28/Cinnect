"use client"

import Link from "next/link"
import { ArrowLeft, Star, Award, TrendingUp, Zap, Shield, Crown, Target, Trophy, Users } from "lucide-react"
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

          {/* Overview */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">Overview</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Cinnect uses a two-part progression system. As you participate in the community by writing reviews, engaging with others, and contributing quality content, you earn Experience Points (XP) that help you level up and unlock new capabilities. Your global ranking among all users is represented by medieval-themed titles.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              The system rewards quality over quantity, encourages meaningful engagement, and recognizes consistent participation. Higher-level users gain increased visibility, greater influence in the community, and access to exclusive features.
            </p>
          </section>

          {/* Levels & Progression */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">Levels & Progression</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Your level represents your overall progress on Cinnect. As you earn more Experience Points (XP), you'll level up and unlock new features. There's no limit to how high you can go - the more you participate, the higher you'll climb!
            </p>

            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-foreground mb-2">What Levels Give You</h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Access to new platform features and tools</li>
                <li>Higher daily activity limits for earning XP</li>
                <li>Greater influence and visibility for your content</li>
                <li>Exclusive recognition and prestige</li>
              </ul>
            </div>

            <h3 className="text-xl font-medium text-foreground mb-3">Level Progression Examples</h3>
            <p className="text-muted-foreground text-sm mb-4">As you level up, you'll unlock features like these:</p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-primary" />
                  Early Levels
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Write reviews and comments</li>
                  <li>Like and interact with content</li>
                  <li>Basic profile features</li>
                  <li>Limited daily activities</li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Mid Levels
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Create and manage communities</li>
                  <li>Save review drafts</li>
                  <li>Higher daily activity limits</li>
                  <li>Better content visibility</li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-primary" />
                  Higher Levels
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Moderation and flagging tools</li>
                  <li>Premium feed placement</li>
                  <li>Early access to new features</li>
                  <li>Platform-wide recognition</li>
                </ul>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  Advanced Levels
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Maximum daily XP potential</li>
                  <li>Elite user recognition</li>
                  <li>Highest content visibility</li>
                  <li>Special privileges and access</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How to Earn Points */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">How to Earn Points (XP)</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You earn XP by participating in the community. Each action has a base XP reward, but the actual amount you receive depends on quality, engagement, and daily caps. Higher-level users have increased daily caps.
            </p>

            <div className="mt-6 space-y-3">
              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Writing a Review</span>
                  <span className="text-sm font-bold text-primary">20 XP base</span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">Daily cap: 120 XP</p>
                <p className="text-sm text-muted-foreground">
                  Quality matters! Well-written, structured reviews with good vocabulary earn more. Reviews with quality score ≥0.8 unlock bonus high-quality review XP (50 XP base, 100 XP daily cap).
                </p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Receiving a Like on Your Review</span>
                  <span className="text-sm font-bold text-primary">2 XP base</span>
                </div>
                <p className="text-sm text-muted-foreground">Daily cap: 40 XP</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Posting a Comment</span>
                  <span className="text-sm font-bold text-primary">5 XP base</span>
                </div>
                <p className="text-sm text-muted-foreground">Daily cap: 30 XP</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Posting a Reply</span>
                  <span className="text-sm font-bold text-primary">3 XP base</span>
                </div>
                <p className="text-sm text-muted-foreground">Daily cap: 24 XP</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Daily Login</span>
                  <span className="text-sm font-bold text-primary">2 XP</span>
                </div>
                <p className="text-sm text-muted-foreground">Daily cap: 2 XP (once per day)</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Creating a Trending Post</span>
                  <span className="text-sm font-bold text-primary">100 XP base</span>
                </div>
                <p className="text-sm text-muted-foreground">Daily cap: 200 XP</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">Creating a Community</span>
                  <span className="text-sm font-bold text-primary">200 XP base</span>
                </div>
                <p className="text-sm text-muted-foreground">Daily cap: 200 XP (once per day)</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <h3 className="text-lg font-medium text-foreground mb-2 flex items-center gap-2">
                <Target className="w-5 h-5" />
                XP Multipliers & Adjustments
              </h3>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li><strong>Quality Weight:</strong> Higher quality content earns more XP. Reviews are weighted heavily on quality (100% multiplier).</li>
                <li><strong>Engagement Weight:</strong> Content that receives likes, replies, and views earns bonus XP.</li>
                <li><strong>Diminishing Returns:</strong> Repeating the same action multiple times per day starts reducing XP after certain thresholds to prevent spam.</li>
                <li><strong>Badge Boosts:</strong> Unlocked badges provide permanent XP multipliers for specific actions.</li>
                <li><strong>Moderation Penalties:</strong> Flagged or low-quality content receives reduced XP or none at all.</li>
              </ul>
            </div>
          </section>

          {/* Badges */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Award className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">Badges & Achievements</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Badges are special achievements unlocked by meeting specific criteria. They provide permanent XP boosts for certain actions and showcase your expertise in different areas.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">Quality Badges</h3>
            <div className="space-y-3">
              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold text-foreground">Hand of the King</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Exceptional, trusted reviews with elite helpfulness.</p>
                <p className="text-xs text-muted-foreground">Criteria: Helpfulness ratio ≥ 0.8 and average review length ≥ 400 characters</p>
                <p className="text-xs text-primary mt-1">Boosts: +10% review XP, +8% review likes XP</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-foreground">Maester's Insight</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Deep analytical reviews with structure and depth.</p>
                <p className="text-xs text-muted-foreground">Criteria: Average review length ≥ 500 characters</p>
                <p className="text-xs text-primary mt-1">Boosts: +8% review XP</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-purple-500" />
                  <span className="font-semibold text-foreground">Three-Eyed Raven</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Original perspective across a broad range of titles and genres.</p>
                <p className="text-xs text-muted-foreground">Criteria: Reviewed ≥ 10 genres and average review length ≥ 300 characters</p>
                <p className="text-xs text-primary mt-1">Boosts: +6% review XP</p>
              </div>
            </div>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">Engagement Badges</h3>
            <div className="space-y-3">
              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold text-foreground">Master of Coin</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Sustained engagement and strong audience response.</p>
                <p className="text-xs text-muted-foreground">Criteria: Total likes received ≥ 100</p>
                <p className="text-xs text-primary mt-1">Boosts: +10% review likes XP</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-green-500" />
                  <span className="font-semibold text-foreground">King's Landing Whisperer</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Consistently active in thoughtful discussions.</p>
                <p className="text-xs text-muted-foreground">Criteria: Comments posted ≥ 50</p>
                <p className="text-xs text-primary mt-1">Boosts: +8% comment XP, +8% reply XP</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-cyan-500" />
                  <span className="font-semibold text-foreground">The Spider</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Meaningful activity across multiple communities and formats.</p>
                <p className="text-xs text-muted-foreground">Criteria: Reviewed ≥ 12 genres covering both movies and TV</p>
                <p className="text-xs text-primary mt-1">Boosts: +5% comment/reply/trending XP</p>
              </div>
            </div>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">Consistency Badges</h3>
            <div className="space-y-3">
              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-foreground">The North Remembers</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Long-term consistency in quality and presence.</p>
                <p className="text-xs text-muted-foreground">Criteria: Reviews written ≥ 40 and longest streak ≥ 14 days</p>
                <p className="text-xs text-primary mt-1">Boosts: +7% review XP</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-indigo-500" />
                  <span className="font-semibold text-foreground">Night's Watch</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Reliable daily contribution streak.</p>
                <p className="text-xs text-muted-foreground">Criteria: Current streak ≥ 7 days</p>
                <p className="text-xs text-primary mt-1">Boosts: +25% daily login XP</p>
              </div>
            </div>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">Community & Viral Badges</h3>
            <div className="space-y-3">
              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold text-foreground">Lord of Winterfell</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Built a successful community with lasting activity.</p>
                <p className="text-xs text-muted-foreground">Criteria: Community reaches 100 members</p>
                <p className="text-xs text-primary mt-1">Boosts: +10% community create XP</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-red-500" />
                  <span className="font-semibold text-foreground">Iron Throne</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Top trending content with platform-wide impact.</p>
                <p className="text-xs text-muted-foreground">Criteria: Achieve gold-tier trending milestone</p>
                <p className="text-xs text-primary mt-1">Boosts: +12% trending XP (48-hour boost)</p>
              </div>

              <div className="border border-border rounded-lg p-4 bg-secondary/10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold text-foreground">Wildfire</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Sudden viral growth in engagement.</p>
                <p className="text-xs text-muted-foreground">Criteria: Trend factor ≥ 1.2 within short time window</p>
                <p className="text-xs text-primary mt-1">Boosts: +8% trending XP</p>
              </div>
            </div>
          </section>

          {/* Quality Scoring */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">What Makes a Great Review</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Quality is the most important factor in your ranking and XP rewards. Here's what makes a review stand out and earn you more points:
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border border-border rounded-lg p-4 bg-secondary/10">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Star className="w-5 h-5 text-green-500" />
                    Content & Length
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Write detailed, thoughtful reviews. Share your genuine thoughts and explain why you liked or disliked something. Longer, more detailed reviews generally earn more points.
                  </p>
                </div>

                <div className="border border-border rounded-lg p-4 bg-secondary/10">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-500" />
                    Structure & Clarity
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Organize your thoughts into paragraphs. Use proper sentences and punctuation. Clear, well-structured reviews are easier to read and more valuable to other users.
                  </p>
                </div>

                <div className="border border-border rounded-lg p-4 bg-secondary/10">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-purple-500" />
                    Unique Vocabulary
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use varied and rich vocabulary. Avoid repeating the same words and phrases. Original, articulate writing shows more effort and expertise.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-border rounded-lg p-4 bg-secondary/10">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-500" />
                    Good Titles
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Create descriptive, engaging titles for your reviews. A good title draws readers in and gives them an idea of your perspective.
                  </p>
                </div>

                <div className="border border-border rounded-lg p-4 bg-secondary/10">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5 text-cyan-500" />
                    Balanced Ratings
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Use the full rating scale thoughtfully. Extreme ratings (like 1 or 10) should be reserved for truly exceptional cases.
                  </p>
                </div>

                <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5 border">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-destructive" />
                    What to Avoid
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Avoid short, repetitive, or spam content. Reviews that are flagged or moderated will earn significantly fewer points.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Ranking System */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">Global Ranking System</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Your global ranking shows how you compare to other users on Cinnect. Unlike your level (which only goes up), your ranking can change based on your performance and how other users are doing. Higher rankings come with prestigious Game of Thrones-themed titles!
            </p>

            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <h3 className="text-lg font-medium text-foreground mb-3">What Affects Your Ranking</h3>
              <p className="text-sm text-muted-foreground mb-3">Your ranking is primarily determined by three things:</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">Quality</div>
                  <div className="text-xs text-muted-foreground">Most Important</div>
                  <p className="text-sm text-muted-foreground mt-2">How well-written and helpful your reviews are</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">Engagement</div>
                  <div className="text-xs text-muted-foreground">Very Important</div>
                  <p className="text-sm text-muted-foreground mt-2">Likes, replies, and interaction your content receives</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">Consistency</div>
                  <div className="text-xs text-muted-foreground">Important</div>
                  <p className="text-sm text-muted-foreground mt-2">How regularly you contribute quality content</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-secondary/10 border border-border rounded-lg">
              <h3 className="text-lg font-medium text-foreground mb-3">Level vs Ranking</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Your Level
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Based on total XP earned</li>
                    <li>Always goes up, never down</li>
                    <li>Unlocks new features</li>
                    <li>Shows your commitment</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    Your Ranking
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Based on performance quality</li>
                    <li>Can go up or down</li>
                    <li>Compares you to others</li>
                    <li>Shows your skill level</li>
                  </ul>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">Ranking Titles</h3>
            <p className="text-muted-foreground text-sm mb-4">These Game of Thrones-inspired titles reflect your global ranking position among all users:</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10">
                <span className="font-semibold text-foreground">Rank #1</span>
                <span className="text-primary font-bold">King</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10">
                <span className="font-semibold text-foreground">Rank #2-10</span>
                <span className="text-primary font-bold">Hand of the King</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10">
                <span className="font-semibold text-foreground">Rank #11-50</span>
                <span className="text-primary font-bold">Small Council Elite</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10">
                <span className="font-semibold text-foreground">Rank #51-200</span>
                <span className="text-primary font-bold">Kingsguard</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10">
                <span className="font-semibold text-foreground">Rank #201-1,000</span>
                <span className="text-primary font-bold">Warden</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10">
                <span className="font-semibold text-foreground">Rank #1,001-5,000</span>
                <span className="text-primary font-bold">Lord</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10">
                <span className="font-semibold text-foreground">Rank #5,001-20,000</span>
                <span className="text-primary font-bold">Bannermen</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10">
                <span className="font-semibold text-foreground">Rank #20,001-100,000</span>
                <span className="text-primary font-bold">Knight</span>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/10">
                <span className="font-semibold text-foreground">Rank #100,001+</span>
                <span className="text-primary font-bold">Smallfolk</span>
              </div>
            </div>
          </section>

          {/* Tips for Success */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-semibold text-foreground m-0">Tips for Success</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">📝 Writing Great Reviews</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Write longer, more detailed reviews with your genuine thoughts</li>
                    <li>Structure your writing with paragraphs and proper sentences</li>
                    <li>Use varied vocabulary and avoid repeating phrases</li>
                    <li>Create engaging titles that capture your perspective</li>
                  </ul>
                </div>

                <div className="p-4 bg-secondary/10 border border-border rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">🎯 Building Your Ranking</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Focus on quality over quantity in all your contributions</li>
                    <li>Engage meaningfully with others' reviews through thoughtful comments</li>
                    <li>Review different genres and both movies and TV shows</li>
                    <li>Maintain consistency with regular participation</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-secondary/10 border border-border rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">🏆 Earning More XP</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Log in daily to maintain your streak and earn bonus XP</li>
                    <li>Participate in communities and create discussions</li>
                    <li>Help your content get likes and replies through engagement</li>
                    <li>Aim for high-quality reviews to unlock bonus XP rewards</li>
                  </ul>
                </div>

                <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">⚠️ Things to Avoid</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Don't write repetitive or spam content</li>
                    <li>Avoid very short reviews that don't add value</li>
                    <li>Don't try to game the system with artificial engagement</li>
                    <li>Be respectful and follow community guidelines</li>
                  </ul>
                </div>
              </div>
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
