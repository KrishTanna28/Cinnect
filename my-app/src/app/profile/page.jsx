"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Settings, LogOut, Trophy, Star, Users, Film, Heart, Award, Flame, Trash2, Pencil, MoreVertical, Lock, Globe, X, LayoutGrid, Bookmark, MessageSquare, ThumbsUp, MessageCircle, AlertTriangle, ScrollText, Eye, Coins, Network, Snowflake, MoonStar, Shield, Castle, Crown, Swords, Hand, Link as LinkIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useUser } from "@/contexts/UserContext"
import * as movieAPI from "@/lib/movies"
import { ProfileSkeleton, CardGridSkeleton, ReviewListSkeleton } from "@/components/skeletons"
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

function ProgressHeader({ stats, bio }) {
  const progression = stats?.progression
  const normalizedBadges = normalizeBadges(stats?.badges, progression?.badges)
  const level = progression?.currentLevel ?? stats?.level ?? 1
  const currentXp = progression?.totalXp ?? stats?.xp?.current ?? stats?.points?.total ?? 0
  const currentLevelMinXp = progression?.currentLevelMinXp ?? 0
  const nextLevelXp = progression?.nextLevelXp ?? stats?.xp?.nextLevel
  const xpIntoLevel = currentXp - currentLevelMinXp
  const xpForLevel = nextLevelXp ? nextLevelXp - currentLevelMinXp : 1
  const progress = nextLevelXp ? Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100)) : 100

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
        <span
          title="Your personal progression based on activity"
          className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] text-primary uppercase"
        >
          XP Level {level}
        </span>
        {(stats?.influenceScore || 0) >= 70 && (
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

      {bio && <p className="text-muted-foreground text-sm text-center sm:text-left">{bio}</p>}
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

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [watchlist, setWatchlist] = useState([])
  const [favorites, setFavorites] = useState([])
  const [reviews, setReviews] = useState([])
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [followModalTab, setFollowModalTab] = useState("followers")
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false)
  const router = useRouter()
  const { user, isLoading, logout } = useUser()

  useEffect(() => {
    // Check authentication
    if (!isLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      const token = localStorage.getItem('token')
      if (token) {
        fetchUserStats(token)
      }
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (activeTab === 'watchlist' && watchlist.length === 0) {
      fetchWatchlist()
    } else if (activeTab === 'favorites' && favorites.length === 0) {
      fetchFavorites()
    } else if (activeTab === 'reviews' && reviews.length === 0) {
      fetchReviews()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const fetchUserStats = async (token) => {
    try {
      const response = await fetch('/api/users/me/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchWatchlist = async () => {
    setWatchlistLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/me/watchlist', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      console.log('Watchlist data:', data)

      if (data.success && data.data.length > 0) {
        // Fetch movie details from TMDB
        const movieDetails = await Promise.all(
          data.data.map(async (item) => {
            try {
              console.log('Fetching movie:', item.movieId)
              const response = await movieAPI.getMovieDetails(item.movieId)
              console.log('Movie response:', response)

              // Extract the actual movie data
              const movieData = response.success ? response.data : response

              return {
                ...movieData,
                addedAt: item.addedAt
              }
            } catch (error) {
              console.error('Error fetching movie:', item.movieId, error)
              return null
            }
          })
        )

        const validMovies = movieDetails.filter(m => m !== null)
        console.log('Valid movies:', validMovies)
        setWatchlist(validMovies)
      } else {
        setWatchlist([])
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error)
    } finally {
      setWatchlistLoading(false)
    }
  }

  const fetchFavorites = async () => {
    setFavoritesLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users/me/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      console.log('Favorites data:', data)

      if (data.success && data.data.length > 0) {
        // Fetch movie details from TMDB
        const movieDetails = await Promise.all(
          data.data.map(async (item) => {
            try {
              const response = await movieAPI.getMovieDetails(item.movieId)

              // Extract the actual movie data
              const movieData = response.success ? response.data : response

              return {
                ...movieData,
                addedAt: item.addedAt
              }
            } catch (error) {
              console.error('Error fetching movie:', item.movieId, error)
              return null
            }
          })
        )

        const validMovies = movieDetails.filter(m => m !== null)
        setFavorites(validMovies)
      } else {
        setFavorites([])
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
    } finally {
      setFavoritesLoading(false)
    }
  }

  const fetchReviews = async () => {
    setReviewsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/reviews/user/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

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

  const removeFromWatchlist = async (movieId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/me/watchlist/${movieId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setWatchlist(watchlist.filter(m => m.id?.toString() !== movieId))
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error)
    }
  }

  const removeFromFavorites = async (movieId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/me/favorites/${movieId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setFavorites(favorites.filter(m => m.id?.toString() !== movieId))
      }
    } catch (error) {
      console.error('Error removing from favorites:', error)
    }
  }

  const handleLogout = () => {
    logout()
  }

  if (isLoading || statsLoading || !user) {
    return <ProfileSkeleton />
  }

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
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
                    <AvatarImage src={user.avatar} alt={user.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">{user.fullName || user.username}</h1>
                    {user.isPrivate && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded-full text-xs text-muted-foreground">
                        <Lock className="w-3 h-3" />
                        Private
                      </span>
                    )}
                  </div>
                  <p className="text-base text-primary font-semibold mb-3">@{user.username}</p>

                  {/* Stats row */}
                  <div className="flex items-center gap-5 mb-3">
                    <div className="text-center">
                      <p className="text-base font-bold text-foreground">{stats?.achievements?.reviewsWritten || 0}</p>
                      <p className="text-xs text-muted-foreground">Reviews</p>
                    </div>
                    <button
                      onClick={() => { setFollowModalTab("followers"); setShowFollowModal(true) }}
                      className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <p className="text-base font-bold text-foreground">{stats?.followersCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </button>
                    <button
                      onClick={() => { setFollowModalTab("following"); setShowFollowModal(true) }}
                      className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <p className="text-base font-bold text-foreground">{stats?.followingCount ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Following</p>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-foreground">{stats?.tier || "Smallfolk"}</p>
                    <button
                      type="button"
                      onClick={() => router.push("/leaderboard")}
                      title="Your global position based on quality and influence"
                      className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
                    >
                      {stats?.globalRank ? `Global #${stats.globalRank}` : "Unranked"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="w-px h-46 bg-border self-center" />

              {/* XP Progress */}
              <ProgressHeader stats={stats} bio={user.bio} onOpenLeaderboard={() => router.push("/leaderboard")} />
            </div>

            {/* Right: Settings Button */}
            <Link href="/settings">
              <Button variant="secondary" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Button>
            </Link>
          </div>

          {/* Mobile/Tablet Layout */}
          <div className="lg:hidden flex flex-col gap-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-4 sm:gap-6">
              <button onClick={() => setShowAvatarLightbox(true)} className="cursor-pointer transition-all active:scale-95 flex-shrink-0">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-primary">
                  <AvatarImage src={user.avatar} alt={user.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl sm:text-4xl">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className="text-center sm:text-left">
                <div className="flex items-center gap-3 mb-2 justify-center sm:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{user.fullName || user.username}</h1>
                  {user.isPrivate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded-full text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      Private
                    </span>
                  )}
                </div>
                <p className="text-base text-primary font-semibold mb-3">@{user.username}</p>

                {/* Stats row */}
                <div className="flex items-center gap-5 mb-3 justify-center sm:justify-start">
                  <div className="text-center">
                    <p className="text-base font-bold text-foreground">{stats?.achievements?.reviewsWritten || 0}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                  <button
                    onClick={() => { setFollowModalTab("followers"); setShowFollowModal(true) }}
                    className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <p className="text-base font-bold text-foreground">{stats?.followersCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </button>
                  <button
                    onClick={() => { setFollowModalTab("following"); setShowFollowModal(true) }}
                    className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <p className="text-base font-bold text-foreground">{stats?.followingCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Following</p>
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-2xl font-bold text-foreground">{stats?.tier || "Smallfolk"}</p>
                  <button
                    type="button"
                    onClick={() => router.push("/leaderboard")}
                    title="Your global position based on quality and influence"
                    className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    {stats?.globalRank ? `Global #${stats.globalRank}` : "Unranked"}
                  </button>
                </div>
                <div className="mt-4 flex justify-center sm:justify-start">
                  <Link href="/settings">
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* XP Progress Section - Mobile */}
            <ProgressHeader stats={stats} bio={user.bio} onOpenLeaderboard={() => router.push("/leaderboard")} />
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
              <AvatarImage src={user.avatar} alt={user.username} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground text-8xl">
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      )}

      {/* Followers/Following Modal */}
      <FollowersFollowingModal
        isOpen={showFollowModal}
        onClose={() => setShowFollowModal(false)}
        userId={user._id}
        initialTab={followModalTab}
        followersCount={stats?.followersCount ?? 0}
        followingCount={stats?.followingCount ?? 0}
      />

      {/* Stats - Only show if user has some activity */}
      {(stats?.achievements?.reviewsWritten > 0 || stats?.influenceScore > 0 || stats?.streaks?.current > 0) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <MetricCard icon={Trophy} label="Influence" value={stats?.influenceScore || 0} />
            <MetricCard icon={Award} label="Quality" value={`${Math.round((stats?.averageReviewQuality || 0) * 100)}%`} />
            <MetricCard icon={Flame} label="Impact" value={stats?.trendingPostsCount || 0} />
            <MetricCard icon={Heart} label="Streak" value={stats?.streaks?.current || 0} />
            <MetricCard icon={Star} label="Top Percent" value={stats?.topPercentLabel || "-"} valueClassName="text-2xl" />
            <MetricCard icon={MessageCircle} label="Avg Engagement / Review" value={stats?.averageEngagementPerReview || 0} valueClassName="text-2xl" />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex mb-8 border-b border-border">
          {[
            { id: "overview", label: "Overview", icon: LayoutGrid },
            { id: "watchlist", label: "Watchlist", icon: Bookmark },
            { id: "favorites", label: "Favorites", icon: Heart },
            { id: "reviews", label: "Reviews", icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-2 sm:px-4 py-2.5 font-semibold transition-colors border-b-2 cursor-pointer ${activeTab === tab.id
                  ? "text-primary border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground"
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div>
            <h3 className="text-xl font-bold text-foreground mb-4">Account Information</h3>
            <div className="bg-secondary/20 rounded-lg p-6 border border-border space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="text-foreground font-medium">@{user.username}</p>
              </div>
              {user.preferences?.favoriteGenres && user.preferences.favoriteGenres.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Favorite Genres</p>
                  <div className="flex flex-wrap gap-2">
                    {user.preferences.favoriteGenres.map((genre) => (
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

        {activeTab === "watchlist" && (
          <div>
            <h3 className="text-xl font-bold text-foreground mb-6">Your Watchlist ({watchlist.length})</h3>
            {watchlistLoading ? (
              <CardGridSkeleton count={5} />
            ) : watchlist.length === 0 ? (
              <div className="text-center py-12">
                <Film className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Your watchlist is empty</p>
                <Link href="/browse">
                  <Button>Browse Movies</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {watchlist.map((movie, index) => {
                  const title = movie.title || movie.name
                  const mediaType = movie.media_type || (movie.title ? 'movie' : 'tv')
                  const detailsUrl = mediaType === 'tv' ? `/tv/${movie.id}` : `/movies/${movie.id}`

                  return (
                    <div key={`watchlist-${movie.id}-${index}`} className="group relative">
                      <Link href={detailsUrl}>
                        <div className="poster-card cursor-pointer">
                          <img
                            src={`https://image.tmdb.org/t/p/w500${movie.poster}`}
                            alt={title}
                            className="w-full h-auto rounded-lg"
                          />
                          <div className="poster-overlay">
                            <div className="w-full">
                              <h3 className="font-bold text-white mb-2 line-clamp-2">{title}</h3>
                              <span className="rating-badge"><Star className="w-3 h-3 text-primary fill-current" />{movie.rating?.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-white cursor-pointer p-1 transition-all active:scale-90 hover:text-primary">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => removeFromWatchlist(movie.id?.toString())}
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove from Watchlist
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "favorites" && (
          <div>
            <h3 className="text-xl font-bold text-foreground mb-6">Your Favorites ({favorites.length})</h3>
            {favoritesLoading ? (
              <CardGridSkeleton count={5} />
            ) : favorites.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">You haven't added any favorites yet</p>
                <Link href="/browse">
                  <Button>Browse Movies</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {favorites.map((movie, index) => {
                  const title = movie.title || movie.name
                  const mediaType = movie.media_type || (movie.title ? 'movie' : 'tv')
                  const detailsUrl = mediaType === 'tv' ? `/tv/${movie.id}` : `/movies/${movie.id}`

                  return (
                    <div key={`watchlist-${movie.id}-${index}`} className="group relative">
                      <Link href={detailsUrl}>
                        <div className="poster-card cursor-pointer">
                          <img
                            src={`https://image.tmdb.org/t/p/w500${movie.poster}`}
                            alt={title}
                            className="w-full h-auto rounded-lg"
                          />
                          <div className="poster-overlay">
                            <div className="w-full">
                              <h3 className="font-bold text-white mb-2 line-clamp-2">{title}</h3>
                              <span className="rating-badge"><Star className="w-3 h-3 text-primary fill-current" />{movie.rating?.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-white cursor-pointer p-1 transition-all active:scale-90 hover:text-primary">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => removeFromFavorites(movie.id?.toString())}
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove from Favorites
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div>
            <h3 className="text-xl font-bold text-foreground mb-6">Your Reviews ({reviews.length})</h3>
            {reviewsLoading ? (
              <ReviewListSkeleton count={3} />
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">You haven't written any reviews yet</p>
                <Link href="/browse">
                  <Button>Browse Movies</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review, index) => (
                  <Link key={review._id || `review-${index}`} href={`/reviews/${review.mediaType}/${review.mediaId}`}>
                    <div className="bg-secondary/20 rounded-lg p-6 border border-border hover:border-primary transition-colors cursor-pointer mb-4">
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
                        <span><ThumbsUp className="w-3.5 h-3.5 inline mr-1" />{review.likeCount == 1 ? '1 like' : `${review.likeCount} likes`}</span>
                        <span><MessageCircle className="w-3.5 h-3.5 inline mr-1" />{review.replyCount == 1 ? '1 reply' : `${review.replyCount} replies`}</span>
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
    </main>
  )
}
