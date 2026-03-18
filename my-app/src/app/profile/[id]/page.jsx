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
  AlertTriangle
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ProfileSkeleton, CardGridSkeleton, ReviewListSkeleton } from "@/components/skeletons"
import { useUser } from "@/contexts/UserContext"
import * as movieAPI from "@/lib/movies"
import FollowersFollowingModal from "@/components/followers-following-modal"

export default function PublicProfilePage({ params }) {
  const unwrappedParams = use(params)
  const userId = unwrappedParams.id
  const router = useRouter()
  const { user: currentUser } = useUser()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [followStatus, setFollowStatus] = useState('none')
  // No followLoading state — we use optimistic updates for instant UI
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
      const token = localStorage.getItem('token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

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
      const token = localStorage.getItem('token')
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

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

  const handleFollowToggle = async () => {
    const token = localStorage.getItem('token')
    if (!token || !currentUser) {
      router.push('/login')
      return
    }

    const isUnfollow = followStatus === 'following' || followStatus === 'requested'

    // Snapshot for rollback
    const prevStatus = followStatus
    const prevCount = followersCount

    // Optimistic update — immediately reflect in UI
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
          'Authorization': `Bearer ${token}`,
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
  const totalPoints = typeof profile.points === 'object' ? profile.points?.total : profile.points

  const getFollowButton = () => {
    if (profile.isOwnProfile) return null

    if (followStatus === 'following') {
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
              <UserCheck className="w-4 h-4" />
              Following
            </>
          )}
        </Button>
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
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-0">
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
                  <h1 className="text-2xl sm:text-4xl font-bold text-foreground">{profile.fullName || profile.username}</h1>
                  {profile.isPrivate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded-full text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      Private
                    </span>
                  )}
                </div>
                <p className="text-lg text-primary font-semibold mb-3">@{profile.username}</p>

                {/* Instagram-style stats row */}
                <div className="flex items-center gap-6 mb-3 justify-center sm:justify-start">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{profile.stats?.totalReviews || 0}</p>
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
                    <p className="text-lg font-bold text-foreground">{followersCount}</p>
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
                    <p className="text-lg font-bold text-foreground">{followingCount}</p>
                    <p className="text-xs text-muted-foreground">Following</p>
                  </button>
                </div>

                <p className="text-muted-foreground text-sm">Level {profile.level || 1} • {totalPoints || 0} Points</p>
                {profile.bio && <p className="text-muted-foreground mt-2 max-w-2xl text-sm justify-center sm:justify-start">{profile.bio}</p>}
                
                {/* Mutual Followers Preview */}
                {!profile.isOwnProfile && profile.mutuals?.total > 0 && (
                  <button
                    onClick={() => { setFollowModalTab("mutuals"); setShowFollowModal(true) }}
                    className="flex items-center gap-2 cursor-pointer group w-fit mt-3 mx-auto sm:mx-0"
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
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 justify-center sm:justify-end">
              {getFollowButton()}
              {followStatus === 'following' && profile.isFollowedBy}
            </div>
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
          {/* Stats */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground text-sm">Points</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{totalPoints?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground text-sm">Level</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{profile.level || 1}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground text-sm">Avg Rating</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{profile.stats?.averageRating || '0.0'}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Film className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground text-sm">Watchlist</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{profile.watchlistCount || 0}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Heart className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground text-sm">Favorites</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{profile.favoritesCount || 0}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <Flame className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground text-sm">Streak</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{profile.streak?.current || 0}</p>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Achievements</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">Reviews Written</span>
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{profile.stats?.totalReviews || 0}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">Likes Received</span>
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{profile.stats?.totalLikes || 0}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">Longest Streak</span>
                  <Flame className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{profile.streak?.longest || 0}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">Member Days</span>
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{profile.memberDays || 0}</p>
              </div>
            </div>
          </div>

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
                        ? new Date(profile.memberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
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
                              <h4 className="font-bold text-foreground text-lg">{review.title || 'Review'}</h4>
                              <p className="text-sm text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString('en-US', {
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
