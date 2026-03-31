"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  User,
  Star,
  Trophy,
  Flame,
  Heart,
  Film,
  Award,
  ArrowLeft,
  Lock,
  UserPlus,
  UserCheck,
  Loader2,
  Clock,
  Users,
  Trash2,
  Pencil,
  MoreVertical,
  X,
  ThumbsUp,
  MessageCircle,
  AlertTriangle,
  ScrollText,
  Eye,
  Coins,
  Network,
  Snowflake,
  MoonStar,
  Shield,
  Castle,
  Crown,
  Swords,
  Hand,
  Link as LinkIcon
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProfileSkeleton, CardGridSkeleton, ReviewListSkeleton } from "@/components/skeletons"
import { useUser } from "@/contexts/UserContext"
import * as movieAPI from "@/lib/movies"
import FollowersFollowingModal from "@/components/followers-following-modal"

const BADGE_STYLES = {
  hand_of_the_king: "from-amber-500/20 to-yellow-400/10 border-amber-500/30",
  maesters_insight: "from-sky-500/20 to-cyan-400/10 border-sky-500/30",
  three_eyed_raven: "from-indigo-500/20 to-blue-400/10 border-indigo-500/30",
  iron_throne: "from-rose-500/20 to-orange-400/10 border-rose-500/30"
}

function getBadgeStyle(badgeId) {
  return BADGE_STYLES[badgeId] || "from-primary/10 to-primary/5 border-primary/20"
}

const BADGE_ICON_BY_ID = {
  hand_of_the_king: Hand,
  maesters_insight: ScrollText,
  three_eyed_raven: Eye,
  master_of_coin: Coins,
  kings_landing_whisperer: MessageCircle,
  the_spider: Network,
  the_north_remembers: Snowflake,
  nights_watch: MoonStar,
  lord_of_winterfell: Shield,
  warden_of_the_west: Castle,
  breaker_of_chains: LinkIcon,
  iron_throne: Crown,
  wildfire: Flame,
  battle_of_the_bastards: Swords
}

const BADGE_ICON_BY_KEY = {
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
  throne: Crown,
  flame: Flame,
  swords: Swords,
  star: Star
}

function getBadgeIcon(badge) {
  return BADGE_ICON_BY_ID[badge?.badgeId] || BADGE_ICON_BY_KEY[badge?.icon] || Award
}

function getBadgeInitials(name = "Badge") {
  const words = String(name).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return "B"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase()
}

function normalizeBadges(badges = [], progressionBadges = []) {
  const merged = [...progressionBadges, ...badges].filter(Boolean)
  const byId = new Map()

  merged.forEach((badge, index) => {
    const id = badge.badgeId || badge.id || badge.name || `badge-${index}`
    const existing = byId.get(id)
    byId.set(id, {
      badgeId: badge.badgeId || existing?.badgeId || id,
      name: badge.name || existing?.name || "Unknown Badge",
      description:
        badge.description ||
        existing?.description ||
        "Awarded for outstanding activity and contribution.",
      earnedAt: badge.earnedAt || existing?.earnedAt || null
    })
  })

  return Array.from(byId.values())
}

function BadgeToken({ badge }) {
  const [open, setOpen] = useState(false)
  const BadgeIcon = getBadgeIcon(badge)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={() => setOpen(prev => !prev)}
          className={`h-8 w-8 shrink-0 rounded-full border bg-gradient-to-br ${getBadgeStyle(badge.badgeId)} text-[10px] font-bold text-foreground transition-transform hover:scale-105`}
          aria-label={badge.name}
          title={badge.name}
        >
          <BadgeIcon className="mx-auto h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 shrink-0 rounded-full border bg-gradient-to-br ${getBadgeStyle(badge.badgeId)} flex items-center justify-center text-xs font-bold`}
            >
              <BadgeIcon className="h-5 w-5" />
            </div>
            <p className="font-semibold text-foreground leading-tight">{badge.name}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{badge.description}</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function InlineBadgeRail({ badges }) {
  if (!badges?.length) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pl-2" aria-label="Earned badges">
      {badges.map((badge, index) => (
        <BadgeToken key={`${badge.badgeId || badge.name}-${index}`} badge={badge} />
      ))}
    </div>
  )
}

function getReviewQualityLabel(score = 0) {
  if (score >= 0.9) return "Hand of the King"
  if (score >= 0.8) return "Maester's Insight"
  if (score >= 0.65) return "Knighted Review"
  return null
}

const MAX_LEVEL = 10

function PublicProgressHeader({ profile }) {
  const progression = profile?.progression
  const normalizedBadges = normalizeBadges(profile?.badges, progression?.badges)
  const level = progression?.currentLevel ?? profile?.xpLevel ?? profile?.level ?? 1
  const currentXp = progression?.totalXp ?? profile?.xp?.current ?? profile?.points?.total ?? 0
  const currentLevelMinXp = progression?.currentLevelMinXp ?? 0
  const nextLevelXp = progression?.nextLevelXp ?? profile?.xp?.nextLevel
  const xpIntoLevel = currentXp - currentLevelMinXp
  const xpForLevel = nextLevelXp ? nextLevelXp - currentLevelMinXp : 1
  const progress = nextLevelXp ? Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100)) : 100

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
        <span
          title="Personal progression based on activity"
          className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary uppercase"
        >
          XP Level {level}
        </span>
        {(profile?.influenceScore || 0) >= 70 && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
            Influence Boost
          </span>
        )}
      </div>

      {/* Level segments + inline badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex gap-1">
            {Array.from({ length: MAX_LEVEL }, (_, i) => {
              const segmentLevel = i + 1
              const isCurrent = segmentLevel === level
              const isCompleted = segmentLevel < level
              const isMax = level >= MAX_LEVEL

              return (
                <div
                  key={segmentLevel}
                  className={`relative h-2 flex-1 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? "bg-gradient-to-r from-amber-500 to-primary"
                      : isCurrent && !isMax
                      ? "bg-secondary/60 overflow-hidden"
                      : isCurrent && isMax
                      ? "bg-gradient-to-r from-amber-500 via-primary to-red-500"
                      : "bg-secondary/30"
                  }`}
                  title={`Level ${segmentLevel}`}
                >
                  {isCurrent && !isMax && (
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-primary transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Lvl 1</span>
            <span>Lvl {MAX_LEVEL}</span>
          </div>
        </div>
        <InlineBadgeRail badges={normalizedBadges} />
      </div>

      {/* XP details */}
      <div className="text-sm text-center sm:text-left">
        <p className="text-foreground font-medium">{currentXp.toLocaleString()} XP Total</p>
        {nextLevelXp ? (
          <p className="text-muted-foreground">
            {xpIntoLevel.toLocaleString()} / {xpForLevel.toLocaleString()} XP to Level {level + 1} ({progress}%)
          </p>
        ) : (
          <p className="text-muted-foreground">Max level reached</p>
        )}
      </div>

      {profile?.bio && <p className="text-muted-foreground text-sm text-center sm:text-left">{profile.bio}</p>}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, accent = "text-primary", valueClassName = "text-4xl" }) {
  return (
    <div className="bg-secondary/30 rounded-xl p-5 border border-border min-h-[148px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <span className="text-muted-foreground text-sm leading-5 max-w-[10rem]">{label}</span>
        <Icon className={`w-5 h-5 ${accent} shrink-0`} />
      </div>
      <p className={`${valueClassName} font-bold text-foreground tracking-tight`}>{value}</p>
    </div>
  )
}

function HeaderStat({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  )
}

export default function PublicProfilePage({ params }) {
  const unwrappedParams = use(params)
  const userId = unwrappedParams.id
  const router = useRouter()
  const { user: currentUser } = useUser()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followStatus, setFollowStatus] = useState('none')
  // No followLoading state â€” we use optimistic updates for instant UI
  const followLoading = false // kept for button compat, always false
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [followModalTab, setFollowModalTab] = useState('followers')
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false)

  const [activeTab, setActiveTab] = useState("overview")
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [watchlist, setWatchlist] = useState([])
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)

  useEffect(() => {
    if (userId) {
      if (currentUser && currentUser._id === userId) {
        router.replace('/profile')
        return
      }
      fetchUserProfile()
    }
  }, [userId, currentUser])

  useEffect(() => {
    if (!profile || profile.isProfileLocked) return
    if (activeTab === 'reviews' && reviews.length === 0) {
      fetchReviews()
    }
  }, [activeTab, profile])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const headers = {}
      const response = await fetch(`/api/users/${userId}`, { headers })
      const data = await response.json()

      if (data.success) {
        setProfile(data.data)
        setFollowStatus(data.data.followStatus || 'none')
        setFollowersCount(data.data.followersCount || 0)
        setFollowingCount(data.data.followingCount || 0)
      } else {
        setError(data.message || 'Failed to load profile')
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    setReviewsLoading(true)
    try {
      const headers = {}
      const response = await fetch(`/api/reviews/user/${userId}`, { headers })
      const data = await response.json()
      if (data.success) {
        setReviews(data.data)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  const handleMessageClick = async () => {
    if (!currentUser) {
      router.push('/login')
      return;
    }
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipientId: profile._id })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('cinnect_pending_chat_conv', data.conversation._id);
        router.push('/messages');
      } else {
        console.error(data.message || 'Failed to create conversation');
        router.push('/messages');
      }
    } catch (err) {
      console.error(err);
      router.push('/messages');
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUser) {
      router.push('/login')
      return
    }

    const isUnfollow = followStatus === 'following' || followStatus === 'requested'

    // Snapshot for rollback
    const prevStatus = followStatus
    const prevCount = followersCount

    // Optimistic update â€” immediately reflect in UI
    if (isUnfollow) {
      setFollowStatus('none')
      if (prevStatus === 'following') {
        setFollowersCount(prev => Math.max(0, prev - 1))
      }
    } else {
      // If target is private, go to 'requested'; otherwise 'following'
      if (profile?.isPrivate) {
        setFollowStatus('requested')
      } else {
        setFollowStatus('following')
        setFollowersCount(prev => prev + 1)
      }
    }

    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: isUnfollow ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        // Only reconcile if server truth differs from our optimistic value
        const serverStatus = data.data.status || 'none'
        setFollowStatus(prev => prev !== serverStatus ? serverStatus : prev)
        if (data.data.targetFollowersCount !== undefined) {
          setFollowersCount(prev => prev !== data.data.targetFollowersCount ? data.data.targetFollowersCount : prev)
        }
      } else {
        // Revert on failure
        setFollowStatus(prevStatus)
        setFollowersCount(prevCount)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
      // Revert on network error
      setFollowStatus(prevStatus)
      setFollowersCount(prevCount)
    }
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-background pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <User className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">User Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || 'This user does not exist.'}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </main>
    )
  }

  const isLocked = profile.isProfileLocked

  const getFollowButton = () => {
    if (profile.isOwnProfile) return null

    if (followStatus === 'following') {
      return (
        <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={handleFollowToggle}
          disabled={followLoading}
        >
          {followLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserCheck className="w-4 h-4" />
              Following
            </>
          )}
        </Button>
        {!profile.isPrivate && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMessageClick}
        >
          Message
      </Button>)}
      </div>
      )
    }

    if (followStatus === 'requested') {
      return (
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={handleFollowToggle}
          disabled={followLoading}
        >
          {followLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Clock className="w-4 h-4" />
              Requested
            </>
          )}
        </Button>
      )
    }

    return (
      <div className="flex items-center gap-2">
      <Button
        size="sm"
        className="gap-2"
        onClick={handleFollowToggle}
        disabled={followLoading}
      >
        {followLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Follow
          </>
        )}
      </Button>
      {!profile.isPrivate && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleMessageClick}
        >
          Message
      </Button>)}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Desktop Layout */}
          <div className="hidden lg:flex lg:items-start lg:justify-between">
            {/* Left side: User Info + XP Progress */}
            <div className="flex items-start gap-8">
              {/* User Info */}
              <div className="flex items-start gap-6">
                <button onClick={() => setShowAvatarLightbox(true)} className="cursor-pointer transition-all active:scale-95 flex-shrink-0">
                  <Avatar className="w-24 h-24 border-4 border-primary">
                    <AvatarImage src={profile.avatar} alt={profile.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                      {profile.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">{profile.fullName || profile.username}</h1>
                    {profile.isPrivate && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded-full text-xs text-muted-foreground">
                        <Lock className="w-3 h-3" />
                        Private
                      </span>
                    )}
                  </div>
                  <p className="text-base text-primary font-semibold mb-3">@{profile.username}</p>

                  {/* Stats row */}
                  <div className="flex items-center gap-5 mb-3">
                    <div className="text-center">
                      <p className="text-base font-bold text-foreground">{profile.stats?.totalReviews || 0}</p>
                      <p className="text-xs text-muted-foreground">Reviews</p>
                    </div>
                    <button
                      onClick={() => {
                        if (isLocked) return;
                        setFollowModalTab("followers");
                        setShowFollowModal(true);
                      }}
                      className={`text-center transition-opacity ${isLocked ? '' : 'cursor-pointer hover:opacity-80'}`}
                    >
                      <p className="text-base font-bold text-foreground">{followersCount}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </button>
                    <button
                      onClick={() => {
                        if (isLocked) return;
                        setFollowModalTab("following");
                        setShowFollowModal(true);
                      }}
                      className={`text-center transition-opacity ${isLocked ? '' : 'cursor-pointer hover:opacity-80'}`}
                    >
                      <p className="text-base font-bold text-foreground">{followingCount}</p>
                      <p className="text-xs text-muted-foreground">Following</p>
                    </button>
                  </div>

                  {/* Mutual Followers Preview */}
                  {!profile.isOwnProfile && profile.mutuals?.total > 0 && (
                    <button
                      onClick={() => { setFollowModalTab("mutuals"); setShowFollowModal(true) }}
                      className="flex items-center gap-2 cursor-pointer group w-fit mb-3"
                    >
                      <div className="flex -space-x-2">
                        {profile.mutuals.preview.map((f) => (
                          <Avatar key={f._id} className="w-6 h-6 border-2 border-background">
                            <AvatarImage src={f.avatar} alt={f.username} />
                            <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                              {f.username?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors text-left">
                        Followed by{" "}
                        <span className="font-semibold text-foreground">
                          {profile.mutuals.preview[0].username}
                        </span>
                        {profile.mutuals.total - 1 > 0 && (
                          <>
                            {" "}and{" "}
                            <span className="font-semibold text-foreground">
                              {profile.mutuals.total - 1} other{(profile.mutuals.total - 1) > 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </p>
                    </button>
                  )}

                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-foreground">{profile?.tier || "Smallfolk"}</p>
                    <button
                      type="button"
                      onClick={() => router.push("/leaderboard")}
                      title="Global position based on quality and influence"
                      className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
                    >
                      {profile?.globalRank ? `Global #${profile.globalRank}` : "Unranked"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-46 bg-border self-center" />

              {/* XP Progress */}
              <PublicProgressHeader profile={profile} />
            </div>

            {/* Right: Follow Button */}
            <div className="flex items-center gap-2">
              {getFollowButton()}
            </div>
          </div>

          {/* Mobile/Tablet Layout */}
          <div className="lg:hidden flex flex-col gap-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-4 sm:gap-6">
              <button onClick={() => setShowAvatarLightbox(true)} className="cursor-pointer transition-all active:scale-95 flex-shrink-0">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-primary">
                  <AvatarImage src={profile.avatar} alt={profile.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl sm:text-4xl">
                    {profile.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-3 mb-2 justify-center sm:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{profile.fullName || profile.username}</h1>
                  {profile.isPrivate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded-full text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      Private
                    </span>
                  )}
                </div>
                <p className="text-base text-primary font-semibold mb-3">@{profile.username}</p>

                {/* Stats row */}
                <div className="flex items-center gap-5 mb-3 justify-center sm:justify-start">
                  <div className="text-center">
                    <p className="text-base font-bold text-foreground">{profile.stats?.totalReviews || 0}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                  <button
                    onClick={() => {
                      if (isLocked) return;
                      setFollowModalTab("followers");
                      setShowFollowModal(true);
                    }}
                    className={`text-center transition-opacity ${isLocked ? '' : 'cursor-pointer hover:opacity-80'}`}
                  >
                    <p className="text-base font-bold text-foreground">{followersCount}</p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </button>
                  <button
                    onClick={() => {
                      if (isLocked) return;
                      setFollowModalTab("following");
                      setShowFollowModal(true);
                    }}
                    className={`text-center transition-opacity ${isLocked ? '' : 'cursor-pointer hover:opacity-80'}`}
                  >
                    <p className="text-base font-bold text-foreground">{followingCount}</p>
                    <p className="text-xs text-muted-foreground">Following</p>
                  </button>
                </div>

                {/* Mutual Followers Preview */}
                {!profile.isOwnProfile && profile.mutuals?.total > 0 && (
                  <button
                    onClick={() => { setFollowModalTab("mutuals"); setShowFollowModal(true) }}
                    className="flex items-center gap-2 cursor-pointer group w-fit mb-3 mx-auto sm:mx-0"
                  >
                    <div className="flex -space-x-2">
                      {profile.mutuals.preview.map((f) => (
                        <Avatar key={f._id} className="w-6 h-6 border-2 border-background">
                          <AvatarImage src={f.avatar} alt={f.username} />
                          <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                            {f.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors text-left">
                      Followed by{" "}
                      <span className="font-semibold text-foreground">
                        {profile.mutuals.preview[0].username}
                      </span>
                      {profile.mutuals.total - 1 > 0 && (
                        <>
                          {" "}and{" "}
                          <span className="font-semibold text-foreground">
                            {profile.mutuals.total - 1} other{(profile.mutuals.total - 1) > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </p>
                  </button>
                )}

                <div className="space-y-1 mb-3">
                  <p className="text-2xl font-bold text-foreground">{profile?.tier || "Smallfolk"}</p>
                  <button
                    type="button"
                    onClick={() => router.push("/leaderboard")}
                    title="Global position based on quality and influence"
                    className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    {profile?.globalRank ? `Global #${profile.globalRank}` : "Unranked"}
                  </button>
                </div>

                <div className="flex justify-center sm:justify-start">
                  {getFollowButton()}
                </div>
              </div>
            </div>

            {/* XP Progress Section - Mobile */}
            <PublicProgressHeader profile={profile} />
          </div>
        </div>
      </div>

      {/* Avatar Lightbox */}
      {showAvatarLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowAvatarLightbox(false)}
        >
          <button
            onClick={() => setShowAvatarLightbox(false)}
            className="absolute top-4 right-4 p-2 transition-all active:scale-90 cursor-pointer z-10"
          >
            <X className="w-6 h-6 text-white/70 hover:text-white" />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="animate-in zoom-in-75 duration-300">
            <Avatar className="w-64 h-64 sm:w-80 sm:h-80 border-4 border-primary shadow-2xl">
              <AvatarImage src={profile.avatar} alt={profile.username} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground text-8xl">
                {profile.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      )}

      {/* Followers/Following Modal */}
      <FollowersFollowingModal
        isOpen={showFollowModal}
        onClose={() => setShowFollowModal(false)}
        userId={userId}
        initialTab={followModalTab}
        followersCount={followersCount}
        followingCount={followingCount}
        isLocked={isLocked}
      />

      {/* Private Profile Lock Screen */}
      {isLocked ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            This Account is Private
          </h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            Follow this account to see their reviews, watchlist, favorites, and more.
          </p>
          {followStatus === 'requested' ? (
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="secondary"
                className="gap-2"
                onClick={handleFollowToggle}
                disabled={followLoading}
              >
                {followLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    Request Sent
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Your follow request is pending approval
              </p>
            </div>
          ) : followStatus === 'none' ? (
            <Button
              className="gap-2"
              onClick={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Follow to See Profile
                </>
              )}
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Stats - Only show if user has some activity */}
          {(profile.stats?.totalReviews > 0 || profile.influenceScore > 0 || profile.streak?.current > 0) && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <MetricCard icon={Trophy} label="Influence" value={profile.influenceScore || 0} />
                <MetricCard icon={Award} label="Quality" value={`${Math.round((profile.averageReviewQuality || 0) * 100)}%`} />
                <MetricCard icon={Flame} label="Impact" value={profile.trendingPostsCount || 0} />
                <MetricCard icon={Heart} label="Streak" value={profile.streak?.current || 0} />
                <MetricCard icon={Star} label="Top Percent" value={profile.topPercentLabel || "-"} valueClassName="text-2xl" />
                <MetricCard icon={MessageCircle} label="Avg Engagement / Review" value={profile.averageEngagementPerReview || 0} valueClassName="text-2xl" />
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex gap-4 mb-8 border-b border-border">
              {["overview", "reviews"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 font-semibold transition-colors border-b-2 cursor-pointer ${activeTab === tab
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                    }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">About</h3>
                <div className="bg-secondary/20 rounded-lg p-6 border border-border space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="text-foreground font-medium">@{profile.username}</p>
                  </div>
                  {profile.fullName && profile.fullName !== profile.username && (
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="text-foreground font-medium">{profile.fullName}</p>
                    </div>
                  )}
                  {profile.bio && (
                    <div>
                      <p className="text-sm text-muted-foreground">Bio</p>
                      <p className="text-foreground font-medium">{profile.bio}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="text-foreground font-medium">
                      {profile.memberSince
                        ? new Date(profile.memberSince).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                  {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Favorite Genres</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.favoriteGenres.map((genre) => (
                          <span key={genre} className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm">
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                <h3 className="text-xl font-bold text-foreground mb-6">Reviews ({reviews.length})</h3>
                {reviewsLoading ? (
                  <ReviewListSkeleton count={3} />
                ) : reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review, index) => (
                      <Link key={review._id || `review-${index}`} href={`/reviews/${review.mediaType}/${review.mediaId}`}>
                        <div className="bg-secondary/20 rounded-lg p-6 border border-border hover:border-primary transition-colors cursor-pointer">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className="font-bold text-foreground text-lg">{review.title || 'Review'}</h4>
                                {getReviewQualityLabel(review?.gamification?.qualityScore) && (
                                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-200">
                                    {getReviewQualityLabel(review?.gamification?.qualityScore)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <span className="rating-badge"><Star className="w-3 h-3 text-primary" /> {review.rating}/10</span>
                          </div>
                          <p className="text-foreground line-clamp-3">{review.content}</p>
                          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                            <span><ThumbsUp className="w-3.5 h-3.5 inline mr-1" />{review.likeCount || 0} likes</span>
                            <span><MessageCircle className="w-3.5 h-3.5 inline mr-1" />{review.replyCount || 0} replies</span>
                            {review.hasSpoilers && <span className="text-red-500"><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />Contains spoilers</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  )
}
