"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Users, Film, Tv, User, Sparkles, Filter, ChevronDown, ChevronUp, Heart, MessageCircle, Eye, Clock, AlertTriangle, ShieldAlert, ThumbsUp, ThumbsDown, Video, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/UserContext"
import { useToast } from "@/hooks/use-toast"
import useInfiniteScroll from "@/hooks/useInfiniteScroll"
import PostMediaPreview from "@/components/post-media-preview"
import { CommunitiesFeedSkeleton } from "@/components/skeletons"
import { shouldFilterAdultContent } from "@/lib/utils/ageUtils"
import { CategoryBadge } from "@/components/category-badge"

const categories = [
  { id: 'all', label: 'All Posts' },
  { id: 'general', label: 'General', icon: Sparkles },
  { id: 'movie', label: 'Movies', icon: Film },
  { id: 'tv', label: 'TV Shows', icon: Tv },
  { id: 'actor', label: 'Actors & Cast', icon: User },
]

const sortOptions = [
  { id: 'recent', label: 'Most Recent' },
  { id: 'popular', label: 'Most Popular' },
  { id: 'hot', label: 'Trending' }
]

export default function CommunitiesPage() {
  const [allPosts, setAllPosts] = useState([]) // All loaded posts
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [recentPosts, setRecentPosts] = useState([])
  const [recentPostsLoading, setRecentPostsLoading] = useState(true)
  const [recommendedCommunities, setRecommendedCommunities] = useState([])
  const [communitiesLoading, setCommunitiesLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const { toast } = useToast()
  const feedContainerRef = useRef(null)
  const leftSidebarRef = useRef(null)
  const rightSidebarRef = useRef(null)
  const votingPosts = useRef(new Set())

  // Global wheel handler: scroll from anywhere (including navbar) goes to the feed container,
  // except when cursor is over a sidebar — then that sidebar scrolls instead.
  useEffect(() => {
    const handleWheel = (e) => {
      const left = leftSidebarRef.current
      const right = rightSidebarRef.current
      const feed = feedContainerRef.current
      if (!feed) return

      // If cursor is over a sidebar that can scroll, let it handle natively
      if (left && left.contains(e.target) && left.scrollHeight > left.clientHeight) return
      if (right && right.contains(e.target) && right.scrollHeight > right.clientHeight) return

      // If cursor is already over the feed scroll container, let it handle natively
      if (feed.contains(e.target)) return

      // Otherwise (navbar, filter bar, empty space), forward scroll to feed
      feed.scrollBy({ top: e.deltaY, left: 0 })
    }
    document.addEventListener('wheel', handleWheel, { passive: true })
    return () => document.removeEventListener('wheel', handleWheel)
  }, [])

  // Infinite scroll
  const loadMoreRef = useInfiniteScroll(
    () => {
      if (hasMore && !loadingMore) {
        loadMorePosts()
      }
    },
    hasMore,
    loadingMore
  )

  useEffect(() => {
    const category = searchParams.get('category')
    const sort = searchParams.get('sort')
    if (category) setSelectedCategory(category)
    if (sort) setSortBy(sort)
  }, [searchParams])

  // Fetch recent posts for sidebar
  useEffect(() => {
    fetchRecentPosts()
    fetchRecommendedCommunities()
  }, [])

  const fetchRecommendedCommunities = async () => {
    setCommunitiesLoading(true)
    try {
      const response = await fetch('/api/communities?sort=popular&limit=10')
      const data = await response.json()
      if (data.success) {
        setRecommendedCommunities(data.data)
      }
    } catch (error) {
      console.error('Error fetching recommended communities:', error)
    } finally {
      setCommunitiesLoading(false)
    }
  }

  const fetchRecentPosts = async () => {
    setRecentPostsLoading(true)
    try {
      const response = await fetch('/api/communities/posts?sort=recent&limit=10')
      const data = await response.json()
      if (data.success) {
        setRecentPosts(data.data)
      }
    } catch (error) {
      console.error('Error fetching recent posts:', error)
    } finally {
      setRecentPostsLoading(false)
    }
  }

  // Reset and fetch when filters change
  useEffect(() => {
    setPage(1)
    setAllPosts([])
    setHasMore(true)
    fetchPosts(1)
  }, [selectedCategory, sortBy])

  const fetchPosts = async (pageNum = 1) => {
    const isFirstPage = pageNum === 1
    if (isFirstPage) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      params.append('sort', sortBy)
      params.append('page', pageNum.toString())
      params.append('limit', '20')

      const response = await fetch(`/api/communities/posts?${params}`)
      const data = await response.json()

      if (data.success) {
        if (isFirstPage) {
          setAllPosts(data.data)
        } else {
          setAllPosts(prev => [...prev, ...data.data])
        }
        setTotalPages(data.pagination.pages)
        setHasMore(pageNum < data.pagination.pages)
        setPage(pageNum)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMorePosts = () => {
    if (!hasMore || loadingMore) return
    fetchPosts(page + 1)
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatTimeAgo = (date) => {
    const now = new Date()
    const posted = new Date(date)
    const diffMs = now - posted
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    if (diffMonths < 12) return `${diffMonths}mo ago`
    return `${diffYears}y ago`
  }

  const handleLikePost = async (e, postId) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    if (votingPosts.current.has(postId)) return
    votingPosts.current.add(postId)

    setAllPosts(prev => prev.map(p => {
      if (p._id !== postId) return p
      const userLiked = p.likes?.some(id => id?.toString() === user._id)
      const userDisliked = p.dislikes?.some(id => id?.toString() === user._id)
      return {
        ...p,
        likes: userLiked
          ? (p.likes || []).filter(id => id?.toString() !== user._id)
          : [...(p.likes || []), user._id],
        likesCount: userLiked ? (p.likesCount || 1) - 1 : (p.likesCount || 0) + 1,
        dislikes: userDisliked
          ? (p.dislikes || []).filter(id => id?.toString() !== user._id)
          : p.dislikes || [],
        dislikesCount: userDisliked ? (p.dislikesCount || 1) - 1 : p.dislikesCount || 0,
      }
    }))

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'like' })
      })
      const data = await response.json()
      if (!data.success) fetchPosts(1)
    } catch { fetchPosts(1) }
    finally { votingPosts.current.delete(postId) }
  }

  const handleDislikePost = async (e, postId) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    if (votingPosts.current.has(postId)) return
    votingPosts.current.add(postId)

    setAllPosts(prev => prev.map(p => {
      if (p._id !== postId) return p
      const userLiked = p.likes?.some(id => id?.toString() === user._id)
      const userDisliked = p.dislikes?.some(id => id?.toString() === user._id)
      return {
        ...p,
        likes: userLiked
          ? (p.likes || []).filter(id => id?.toString() !== user._id)
          : p.likes || [],
        likesCount: userLiked ? (p.likesCount || 1) - 1 : p.likesCount || 0,
        dislikes: userDisliked
          ? (p.dislikes || []).filter(id => id?.toString() !== user._id)
          : [...(p.dislikes || []), user._id],
        dislikesCount: userDisliked ? (p.dislikesCount || 1) - 1 : (p.dislikesCount || 0) + 1,
      }
    }))

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'dislike' })
      })
      const data = await response.json()
      if (!data.success) fetchPosts(1)
    } catch { fetchPosts(1) }
    finally { votingPosts.current.delete(postId) }
  }

  const handleCommentClick = (e, post) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/communities/${post.community?.slug}/posts/${post._id}?comment=true#comments`)
  }

  const handleCommunityNameClick = (e, slug) => {
    e.preventDefault()
    e.stopPropagation()
    if (!slug) return
    router.push(`/communities/${slug}`)
  }

  const handleUserNameClick = (e, userId) => {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) return
    router.push(`/profile/${userId}`)
  }

  return (
    <main className="h-[calc(100vh-4rem)] bg-background flex flex-col overflow-hidden">

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-0 flex flex-col flex-1 min-h-0">
        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            {/* Category Dropdown */}
            <div className="hidden lg:block">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="hidden lg:block">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center gap-2 px-3 py-2 bg-secondary/50 border border-border rounded-lg text-foreground hover:bg-secondary/70 transition-all cursor-pointer"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Create Community Button */}
            {user && (
              <Link href="/communities/new">
                <Button className="gap-2 whitespace-nowrap cursor-pointer" aria-label="Create Community">
                  <Plus className="w-5 h-5" />
                  <span>Create Community</span>
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Filters (collapsible) */}
          <div className={`lg:hidden mt-4 flex flex-col gap-3 transition-all duration-300 ${showFilters ? 'block' : 'hidden'}`}>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area with Sidebars — this is the scroll container, scrollbar at right edge */}
        <div ref={feedContainerRef} className="flex gap-6 flex-1 min-h-0 overflow-y-auto">
          {/* Left Sidebar - Recommended Communities */}
          <aside ref={leftSidebarRef} className="hidden lg:block w-72 flex-shrink-0 self-start sticky top-0 max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain scrollbar-thin">
            <div>
              <div className="bg-secondary/30 rounded-lg border border-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Communities to Join
                  </h3>
                </div>

                {/* Communities List */}
                <div className="divide-y divide-border/50">
                  {communitiesLoading ? (
                    <div className="p-4 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : recommendedCommunities.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No communities found
                    </div>
                  ) : (
                    recommendedCommunities.filter(c => !(shouldFilterAdultContent(user) && c.adult_content)).slice(0, 10).map((community) => {
                      const CategoryIcon = categories.find(c => c.id === community.category)?.icon || Sparkles
                      
                      return (
                        <Link 
                          key={community._id}
                          href={`/communities/${community.slug}`}
                          className="block hover:bg-secondary/50 transition-colors"
                        >
                          <div className="p-3 flex items-center gap-3">
                            {/* Community Icon */}
                            {community.icon ? (
                              <img 
                                src={community.icon} 
                                alt={community.name}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <CategoryIcon className="w-5 h-5 text-primary" />
                              </div>
                            )}

                            {/* Community Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">
                                {community.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  community.category === 'movie' ? 'bg-blue-500/20 text-blue-400' :
                                  community.category === 'tv' ? 'bg-purple-500/20 text-purple-400' :
                                  community.category === 'actor' ? 'bg-green-500/20 text-green-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {community.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {formatNumber(community.memberCount || 0)}
                                </span>
                                <span>•</span>
                                <span>{formatNumber(community.postCount || 0)} posts</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Posts Feed - Main Column */}
          <div className="flex-1 min-w-0 pb-6">
            {/* Posts Feed */}
            {loading ? (
              <CommunitiesFeedSkeleton />
            ) : allPosts.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-6">Join a community and start posting!</p>
                {user && (
                  <Link href="/communities/new">
                    <Button>Create a Community</Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {allPosts.filter(post => !(shouldFilterAdultContent(user) && post.adult_content)).map((post) => {
                    const CategoryIcon = categories.find(c => c.id === post.community?.category)?.icon || Sparkles
                    const userLiked = user && post.likes?.some(id => id?.toString() === user._id)
                    const userDisliked = user && post.dislikes?.some(id => id?.toString() === user._id)
                    
                    return (
                      <Link 
                        key={post._id} 
                        href={`/communities/${post.community?.slug}/posts/${post._id}`}
                        className="block"
                      >
                        <div className="bg-secondary/20 rounded-lg border border-border hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer overflow-hidden">
                          <div className="p-4">
                            {/* Community Info Header */}
                            <div className="flex items-center gap-3 mb-3">
                              {post.community?.icon ? (
                                <img 
                                  src={post.community?.icon} 
                                  alt={post.community?.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                  <CategoryIcon className="w-4 h-4 text-primary" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => handleCommunityNameClick(e, post.community?.slug)}
                                    className="relative font-medium text-foreground text-sm truncate hover:text-primary transition-all active:scale-90 cursor-pointer"
                                  >
                                    {post.community?.name || 'Unknown Community'}
                                  </button>
                                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                                    post.community?.category === 'movie' ? 'bg-blue-500/20 text-blue-400' :
                                    post.community?.category === 'tv' ? 'bg-purple-500/20 text-purple-400' :
                                    post.community?.category === 'actor' ? 'bg-green-500/20 text-green-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {post.community?.category}
                                  </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>Posted by</span>
                                    {post.user?.username ? (
                                      <button
                                        onClick={(e) => handleUserNameClick(e, post.user?._id)}
                                        className="relative text-xs text-foreground hover:text-primary transition-all active:scale-90 cursor-pointer"
                                      >
                                        {post.user?.username === user?.username ? 'You' : post.user?.username}
                                      </button>
                                    ) : (
                                      <span>Anonymous</span>
                                    )}
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {formatTimeAgo(post.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Post Title */}
                              <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 hover:text-primary transition-colors leading-tight">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                  <CategoryBadge 
                                    category={post.category} 
                                    customCategory={post.custom_category} 
                                    categoryColor={post.category_color} 
                                    className="text-[10px] px-1.5 py-0"
                                  />
                                  {post.spoiler && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-destructive/20 text-destructive rounded text-[10px] font-semibold">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      SPOILER
                                    </span>
                                  )}
                                  {post.adult_content && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-[10px] font-semibold">
                                      <ShieldAlert className="w-2.5 h-2.5" />
                                      18+
                                    </span>
                                  )}
                                </div>
                                {post.title}
                              </h3>

                              {/* Post Media Preview */}
                              <PostMediaPreview images={post.images} videos={post.videos} />

                              {/* Post Stats */}
                              <div className="flex items-center gap-4 text-sm pt-2 border-t border-border/50">
                                <button
                                  onClick={(e) => handleLikePost(e, post._id)}
                                  className={`flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                                    userLiked
                                      ? 'text-primary font-bold'
                                      : 'text-muted-foreground hover:text-primary'
                                  }`}
                                >
                                  <ThumbsUp className={`w-4 h-4 ${userLiked ? 'fill-primary text-primary' : ''}`} />
                                  <span>{formatNumber(post.likesCount || 0)}</span>
                                </button>
                                <button
                                  onClick={(e) => handleDislikePost(e, post._id)}
                                  className={`flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                                    userDisliked
                                      ? 'text-destructive'
                                      : 'text-muted-foreground hover:text-destructive'
                                  }`}
                                >
                                  <ThumbsDown className={`w-4 h-4 ${userDisliked ? 'fill-destructive text-destructive' : ''}`} />
                                  <span>{formatNumber(post.dislikesCount || 0)}</span>
                                </button>
                                <button
                                  onClick={(e) => handleCommentClick(e, post)}
                                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{formatNumber(post.commentsCount || 0)}</span>
                                </button>
                                <span className="flex items-center gap-2 text-muted-foreground">
                                  <Eye className="w-4 h-4" />
                                  <span>{formatNumber(post.views || 0)}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>

                  {/* Load More Trigger & Loading State */}
                  <div ref={loadMoreRef} className="mt-8 flex justify-center">
                    {loadingMore && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading more posts...</span>
                      </div>
                    )}
                    {!loadingMore && !hasMore && allPosts.length > 0 && (
                      <p className="text-muted-foreground text-sm">
                        You've reached the end • {allPosts.length} posts loaded
                      </p>
                    )}
                  </div>
                </>
              )}
          </div>

          {/* Recent Posts Sidebar - Right Column */}
          <aside ref={rightSidebarRef} className="hidden xl:block w-80 flex-shrink-0 self-start sticky top-0 max-h-[calc(100vh-10rem)] overflow-y-auto overscroll-contain scrollbar-thin">
            <div>
              <div className="bg-secondary/30 rounded-lg border border-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Recent Posts
                  </h3>
                </div>

                {/* Posts List */}
                <div className="divide-y divide-border/50">
                  {recentPostsLoading ? (
                    <div className="p-4 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : recentPosts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No recent posts
                    </div>
                  ) : (
                    recentPosts.filter(post => !(shouldFilterAdultContent(user) && post.adult_content)).slice(0, 10).map((post) => {
                      const CategoryIcon = categories.find(c => c.id === post.community?.category)?.icon || Sparkles
                      
                      return (
                        <Link 
                          key={post._id}
                          href={`/communities/${post.community?.slug}`}
                          className="block hover:bg-secondary/50 transition-colors"
                        >
                          <div className="p-3 flex gap-3">
                            {/* Post Info */}
                            <div className="flex-1 min-w-0">
                              {/* Community & Time */}
                              <div className="flex items-center gap-2 mb-1">
                                {post.community?.icon ? (
                                  <img 
                                    src={post.community.icon} 
                                    alt={post.community.name}
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                    <CategoryIcon className="w-3 h-3 text-primary" />
                                  </div>
                                )}
                                <button
                                  onClick={(e) => handleCommunityNameClick(e, post.community?.slug)}
                                  className="relative text-xs text-muted-foreground truncate hover:text-primary transition-all active:scale-90 cursor-pointer"
                                >
                                  c/{post.community?.name || 'Unknown'}
                                </button>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTimeAgo(post.createdAt)}
                                </span>
                              </div>

                              {/* Title */}
                              <div className="flex flex-wrap items-center gap-1 mb-1">
                                <CategoryBadge 
                                  category={post.category} 
                                  customCategory={post.custom_category} 
                                  categoryColor={post.category_color} 
                                  className="text-[9px] px-1.5 py-0 h-4"
                                />
                                {post.spoiler && (
                                  <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0 h-4 rounded bg-destructive/20 text-destructive font-semibold">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    SPOILER
                                  </span>
                                )}
                                {post.adult_content && (
                                  <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0 h-4 rounded bg-orange-500/20 text-orange-400 font-semibold">
                                    <ShieldAlert className="w-2.5 h-2.5" />
                                    18+
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm text-foreground line-clamp-2 leading-snug">
                                {post.title}
                              </h4>

                              {/* Stats */}
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <ThumbsUp className="w-3 h-3" />
                                  {formatNumber(post.likesCount || 0)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <ThumbsDown className="w-3 h-3" />
                                  {formatNumber(post.dislikesCount || 0)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="w-3 h-3" />
                                  {formatNumber(post.commentsCount || 0)}
                                </span>
                              </div>
                            </div>

                            {/* Thumbnail */}
                            {post.images && post.images.length > 0 ? (
                              <div className="flex-shrink-0">
                                <div className="w-16 h-16 rounded-md overflow-hidden bg-black/50 flex items-center justify-center">
                                  <img 
                                    src={post.images[0]} 
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            ) : post.videos && post.videos.length > 0 ? (
                              <div className="flex-shrink-0">
                                <div className="w-16 h-16 rounded-md overflow-hidden bg-black/50 flex items-center justify-center relative">
                                  <video 
                                    src={post.videos[0]} 
                                    className="w-full h-full object-cover"
                                    preload="metadata"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <Play className="w-5 h-5 text-white fill-white" />
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}

