"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Settings, LogOut, Trophy, Star, Users, Film, Heart, Award, Flame, Trash2, Pencil, MoreVertical, Lock, Globe, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@/contexts/UserContext"
import * as movieAPI from "@/lib/movies"
import { ProfileSkeleton, CardGridSkeleton, ReviewListSkeleton } from "@/components/skeletons"
import FollowersFollowingModal from "@/components/followers-following-modal"

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
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-0">
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
                  <h1 className="text-2xl sm:text-4xl font-bold text-foreground">{user.fullName || user.username}</h1>
                  {user.isPrivate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary/50 rounded-full text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      Private
                    </span>
                  )}
                </div>
                <p className="text-lg text-primary font-semibold mb-3">@{user.username}</p>

                {/* Instagram-style stats row */}
                <div className="flex items-center gap-6 mb-3 justify-center sm:justify-start">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{stats?.achievements?.reviewsWritten || 0}</p>
                    <p className="text-xs text-muted-foreground">Posts</p>
                  </div>
                  <button
                    onClick={() => { setFollowModalTab("followers"); setShowFollowModal(true) }}
                    className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <p className="text-lg font-bold text-foreground">{user.followers?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </button>
                  <button
                    onClick={() => { setFollowModalTab("following"); setShowFollowModal(true) }}
                    className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <p className="text-lg font-bold text-foreground">{user.following?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Following</p>
                  </button>
                </div>

                <p className="text-muted-foreground text-sm">Level {stats?.level || 1} • {stats?.points?.total || 0} Points</p>
                {user.bio && <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{user.bio}</p>}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 justify-center sm:justify-end">
              <Link href="/settings">
                <Button variant="secondary" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </Button>
              </Link>
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
        followersCount={user.followers?.length || 0}
        followingCount={user.following?.length || 0}
      />

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-secondary/30 rounded-lg p-6 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground text-sm">Points</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats?.points?.total?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-6 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground text-sm">Level</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats?.level || 1}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-6 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground text-sm">Badges</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats?.badges || 0}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-6 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <Film className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground text-sm">Watchlist</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats?.watchlistCount || 0}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-6 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground text-sm">Favorites</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats?.favoritesCount || 0}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-6 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground text-sm">Streak</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats?.streaks?.current || 0}</p>
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
            <p className="text-2xl font-bold text-foreground">{stats?.achievements?.reviewsWritten || 0}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Ratings Given</span>
              <Star className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.achievements?.ratingsGiven || 0}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Watch Parties</span>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.achievements?.watchPartiesJoined || 0}</p>
          </div>
          <div className="bg-secondary/30 rounded-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Friends Referred</span>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.achievements?.friendsReferred || 0}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-8 border-b border-border">
          {["overview", "watchlist", "favorites", "reviews"].map((tab) => (
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
              <div>
                <p className="text-sm text-muted-foreground">Referral Code</p>
                <p className="text-foreground font-medium">{stats?.referralCode || user.referralCode || 'N/A'}</p>
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
                              <span className="rating-badge"><Star className="w-3 h-3 text-primary" />{movie.rating?.toFixed(1)}</span>
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
                              <span className="rating-badge"><Star className="w-3 h-3 text-primary" />{movie.rating?.toFixed(1)}</span>
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
                            <DropdownMenuItem onClick={() => window.location.href = `/movies/${movie.id}`}>
                              <Pencil className="w-4 h-4" />
                              Edit Favorite
                            </DropdownMenuItem>
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
                        <span>👍 {review.likeCount || 0} likes</span>
                        <span>💬 {review.replyCount || 0} replies</span>
                        {review.hasSpoilers && <span className="text-red-500">⚠️ Contains spoilers</span>}
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
