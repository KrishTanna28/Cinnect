"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Users, FileText, Plus, Clock, ThumbsUp, MessageCircle, Pin, Lock, Film, Tv, User as UserIcon, Sparkles, Trash2, UserCheck, UserX, Bell, Pencil, MoreVertical, ThumbsDown, Newspaper, X, Check, ExternalLink } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/UserContext"
import { useToast } from "@/hooks/use-toast"
import useInfiniteScroll from "@/hooks/useInfiniteScroll"
import Link from "next/link"
import PostMediaPreview from "@/components/post-media-preview"
import { CommunityDetailSkeleton } from "@/components/skeletons"

const categoryIcons = {
  general: Sparkles,
  movie: Film,
  tv: Tv,
  actor: UserIcon
}

export default function CommunityPage() {
  const [community, setCommunity] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sortBy, setSortBy] = useState('recent')
  const [isMember, setIsMember] = useState(false)
  const [joining, setJoining] = useState(false)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [processingRequest, setProcessingRequest] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // News state
  const [news, setNews] = useState([])
  const [loadingNews, setLoadingNews] = useState(false)
  const newsContainerRef = useRef(null)
  
  // Edit states
  const [editingAbout, setEditingAbout] = useState(false)
  const [editingRules, setEditingRules] = useState(false)
  const [aboutText, setAboutText] = useState('')
  const [rulesText, setRulesText] = useState([])
  const [savingAbout, setSavingAbout] = useState(false)
  const [savingRules, setSavingRules] = useState(false)

  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()

  // Infinite scroll for posts
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
    fetchCommunity()
    setPage(1)
    setPosts([])
    setHasMore(true)
    fetchPosts(1)
  }, [params.slug])

  useEffect(() => {
    setPage(1)
    setPosts([])
    setHasMore(true)
    fetchPosts(1)
  }, [sortBy])

  // Fetch news when community loads
  useEffect(() => {
    if (community?.name) {
      fetchNews()
      setAboutText(community.description || '')
      setRulesText(community.rules || [])
    }
  }, [community?.name])

  // Auto-scroll news
  useEffect(() => {
    const container = newsContainerRef.current
    if (!container || news.length === 0) return

    let scrollInterval
    let isPaused = false

    const startScroll = () => {
      scrollInterval = setInterval(() => {
        if (!isPaused && container) {
          container.scrollTop += 1
          // Reset to top when reaching bottom
          if (container.scrollTop >= container.scrollHeight - container.clientHeight) {
            container.scrollTop = 0
          }
        }
      }, 50)
    }

    const handleMouseEnter = () => { isPaused = true }
    const handleMouseLeave = () => { isPaused = false }

    container.addEventListener('mouseenter', handleMouseEnter)
    container.addEventListener('mouseleave', handleMouseLeave)

    startScroll()

    return () => {
      clearInterval(scrollInterval)
      container?.removeEventListener('mouseenter', handleMouseEnter)
      container?.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [news])

  const fetchNews = async () => {
    if (!community?.name) return
    setLoadingNews(true)
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY
      
      if (!apiKey || apiKey === 'demo') {
        console.log('❌ News API key not configured')
        setNews([])
        setLoadingNews(false)
        return
      }

      // Build search query based on community category and name
      const searchTerm = community.relatedEntityName || community.name
      const categoryTerms = community.category === 'movie' ? 'movie OR film OR cinema' 
                         : community.category === 'tv' ? 'tv OR series OR show'
                         : community.category === 'actor' ? 'actor OR actress OR celebrity'
                         : 'entertainment'
      
      const url = `https://newsapi.org/v2/everything?q="${encodeURIComponent(searchTerm)}" AND (${categoryTerms})&sortBy=relevancy&pageSize=10&language=en&apiKey=${apiKey}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.status === 'ok' && data.articles?.length > 0) {
        // Filter articles to include those mentioning the search term
        const filteredArticles = data.articles.filter(article => {
          const termLower = searchTerm.toLowerCase()
          const articleTitle = (article.title || '').toLowerCase()
          const articleDesc = (article.description || '').toLowerCase()
          return articleTitle.includes(termLower) || articleDesc.includes(termLower)
        })
        setNews(filteredArticles.length > 0 ? filteredArticles : data.articles.slice(0, 5))
      } else {
        setNews([])
      }
    } catch (err) {
      console.error('Failed to fetch news:', err)
      setNews([])
    } finally {
      setLoadingNews(false)
    }
  }

  const handleSaveAbout = async () => {
    setSavingAbout(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/communities/${params.slug}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ description: aboutText })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setCommunity(prev => ({ ...prev, description: aboutText }))
        setEditingAbout(false)
        toast({ title: 'Success', description: 'About section updated' })
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to update', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
    } finally {
      setSavingAbout(false)
    }
  }

  const handleSaveRules = async () => {
    setSavingRules(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/communities/${params.slug}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rules: rulesText })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setCommunity(prev => ({ ...prev, rules: rulesText }))
        setEditingRules(false)
        toast({ title: 'Success', description: 'Rules updated' })
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to update', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' })
    } finally {
      setSavingRules(false)
    }
  }

  const addRule = () => {
    setRulesText(prev => [...prev, { title: '' }])
  }

  const updateRule = (index, value) => {
    setRulesText(prev => prev.map((rule, i) => i === index ? { title: value } : rule))
  }

  const removeRule = (index) => {
    setRulesText(prev => prev.filter((_, i) => i !== index))
  }

  const fetchCommunity = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}

      const response = await fetch(`/api/communities/${params.slug}`, { headers })
      const data = await response.json()

      if (data.success) {
        setCommunity(data.data)
        setIsMember(data.data.isMember || false)
        setHasPendingRequest(data.data.hasPendingRequest || false)
        setIsCreator(data.data.isCreator || false)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to load community",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching community:', error)
      toast({
        title: "Error",
        description: "Failed to load community",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async (pageNum = 1) => {
    const isFirstPage = pageNum === 1
    if (isFirstPage) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}

      const response = await fetch(`/api/communities/${params.slug}/posts?sort=${sortBy}&page=${pageNum}&limit=10`, { headers })
      const data = await response.json()

      if (data.success) {
        if (isFirstPage) {
          setPosts(data.data)
        } else {
          setPosts(prev => [...prev, ...data.data])
        }
        setPage(pageNum)
        setHasMore(data.pagination && pageNum < data.pagination.pages)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMorePosts = () => {
    if (!hasMore || loadingMore) return
    fetchPosts(page + 1)
  }

  const handleJoinLeave = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to join communities",
        variant: "destructive"
      })
      router.push('/login')
      return
    }

    setJoining(true)
    try {
      const token = localStorage.getItem('token')

      // Handle cancel request
      if (hasPendingRequest) {
        const response = await fetch(`/api/communities/${params.slug}/requests`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        if (data.success) {
          setHasPendingRequest(false)
          toast({
            title: "Request Cancelled",
            description: data.message
          })
        }
        return
      }

      // Handle leave
      if (isMember) {
        const response = await fetch(`/api/communities/${params.slug}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        if (data.success) {
          setIsMember(false)
          toast({
            title: "Left Community",
            description: data.message
          })
          fetchCommunity()
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to leave community",
            variant: "destructive"
          })
        }
        return
      }

      // Handle join or request to join
      const response = await fetch(`/api/communities/${params.slug}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        if (data.data.hasPendingRequest) {
          setHasPendingRequest(true)
          toast({
            title: "Request Sent",
            description: data.message
          })
        } else {
          setIsMember(true)
          toast({
            title: "Joined Community",
            description: data.message
          })
          fetchCommunity()
        }
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update membership",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error updating membership:', error)
      toast({
        title: "Error",
        description: "Failed to update membership",
        variant: "destructive"
      })
    } finally {
      setJoining(false)
    }
  }

  const handleJoinRequest = async (userId, action) => {
    setProcessingRequest(userId)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/communities/${params.slug}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, action })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: action === 'approve' ? 'Request Approved' : 'Request Rejected',
          description: data.message
        })
        fetchCommunity() // Refresh to update pending requests
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to process request',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error processing request:', error)
      toast({
        title: 'Error',
        description: 'Failed to process request',
        variant: 'destructive'
      })
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleDeleteCommunity = async () => {
    if (!confirm('Are you sure you want to delete this community? This action cannot be undone and will delete all posts.')) {
      return
    }

    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/communities/${params.slug}/delete`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Community Deleted',
          description: data.message
        })
        router.push('/communities')
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to delete community',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error deleting community:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete community',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }



  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    return `${Math.floor(months / 12)}y ago`
  }

  const formatDate = (date) => {
    const d = new Date(date)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return <CommunityDetailSkeleton />
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Community not found</p>
      </div>
    )
  }

  const CategoryIcon = categoryIcons[community.category] || Sparkles

  return (
    <main className="min-h-screen bg-background -mt-16">
      {/* Banner - Extended behind navbar */}
      <div className="relative h-48 sm:h-64 bg-black overflow-hidden">
        {community.banner && (
          <img src={community.banner} alt={community.name} className="w-full h-full object-cover" />
        )}
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
      </div>

      {/* Community Header */}
      <div className="bg-secondary/30 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col items-start gap-3 sm:gap-4">
            {/* Icon */}
            <div className="relative -mt-10 sm:-mt-14 flex-shrink-0">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-background border-4 border-background rounded-full overflow-hidden shadow-lg">
                {community.icon ? (
                  <img src={community.icon} alt={community.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-black flex items-center">
                    <CategoryIcon className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="w-full min-w-0">
              {/* Line 1: Community Name - full width */}
              <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">
                {community.name}
              </h1>

              {/* Line 2: Badges (left) + Buttons (right) - NO WRAP */}
              <div className="flex items-center justify-between gap-2 mt-1">
                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                    <CategoryIcon className="w-3 h-3" />
                    {community.category}
                  </span>
                  {community.isPrivate && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary text-foreground rounded text-xs">
                      <Lock className="w-3 h-3" />
                      Private
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(isMember || isCreator) && (
                    <Button
                      onClick={() => window.location.href = `/communities/${params.slug}/new-post`}
                      size="sm"
                      className="gap-1.5 cursor-pointer hidden sm:flex"
                    >
                      <Plus className="w-4 h-4" />
                      Create Post
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="cursor-pointer p-1.5 transition-all active:scale-90">
                        <MoreVertical className="w-5 h-5 hover:text-primary"/>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(isMember || isCreator) && (
                        <DropdownMenuItem 
                          onClick={() => window.location.href = `/communities/${params.slug}/new-post`}
                          className="sm:hidden"
                        >
                          <Plus className="w-4 h-4" />
                          Create Post
                        </DropdownMenuItem>
                      )}
                      {!isCreator && (
                        <DropdownMenuItem
                          onClick={handleJoinLeave}
                          disabled={joining}
                        >
                          {joining ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : isMember ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                          {joining ? "Processing..." :
                            isMember ? "Leave Community" :
                              hasPendingRequest ? "Cancel Request" :
                                community.isPrivate ? "Request to Join" : "Join Community"}
                        </DropdownMenuItem>
                      )}
                      {isCreator && (
                        <>
                          <DropdownMenuItem onClick={() => window.location.href = `/communities/${params.slug}/edit`}>
                            <Pencil className="w-4 h-4" />
                            Edit Community
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleDeleteCommunity}
                            disabled={deleting}
                          >
                            {deleting ? (
                              <div className="w-4 h-4 border-2 border-border border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            {deleting ? "Deleting..." : "Delete Community"}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Line 3: Description */}
              <p className="text-muted-foreground mt-2 text-sm line-clamp-2 lg:hidden md:hidden">{community.description}</p>

              {/* Line 4: Stats */}
              <div className="flex items-center gap-3 mt-2 text-xs sm:text-sm text-muted-foreground">
                <span><strong className="text-foreground">{formatNumber(community.memberCount)}</strong> {community.memberCount === 1 ? "member" : "members"}</span>
                <span><strong className="text-foreground">{formatNumber(community.postCount)}</strong> {community.postCount === 1 ? "post" : "posts"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Section with Sidebars */}
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="flex gap-6">
          {/* Left Sidebar - Community Info (Hidden on mobile) */}
          <aside className="hidden lg:block w-72 lg:w-80 flex-shrink-0">
            <div className="sticky top-20 space-y-4">
              {/* Community Stats Card */}
              <div className="bg-secondary/30 border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Community Info
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Members</span>
                    <span className="text-sm text-muted-foreground">{formatNumber(community.memberCount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Posts</span>
                    <span className="text-sm text-muted-foreground">{formatNumber(community.postCount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                      <CategoryIcon className="w-3 h-3" />
                      {community.category}
                    </span>
                  </div>
                  {community.isPrivate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Privacy</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary text-foreground rounded text-xs">
                        <Lock className="w-3 h-3" />
                        Private
                      </span>
                    </div>
                  )}
                  {community.createdAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm text-muted-foreground">{formatDate(community.createdAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* About Section - Editable */}
              <div className="bg-secondary/30 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    About
                  </h3>
                  {isCreator && !editingAbout && (
                    <button 
                      onClick={() => setEditingAbout(true)}
                      className="p-1 cursor-pointer transition-all active:scale-90 hover:text-primary"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </button>
                  )}
                </div>
                {editingAbout ? (
                  <div className="space-y-2">
                    <textarea
                      value={aboutText}
                      onChange={(e) => setAboutText(e.target.value)}
                      className="w-full p-2 bg-input border border-border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{aboutText.length}/500</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingAbout(false); setAboutText(community.description || '') }}
                          className="p-1.5 transition-all active:scale-90 cursor-pointer"
                        >
                          <X className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </button>
                        <button
                          onClick={handleSaveAbout}
                          disabled={savingAbout}
                          className="p-1.5 transition-all active:scale-90 cursor-pointer"
                        >
                          {savingAbout ? (
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{community.description || 'No description available'}</p>
                )}
              </div>

              {/* Rules Section - Editable */}
              <div className="bg-secondary/30 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Community Rules
                  </h3>
                  {isCreator && !editingRules && (
                    <button 
                      onClick={() => setEditingRules(true)}
                      className="p-1 cursor-pointer transition-all active:scale-90 hover:text-primary"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </button>
                  )}
                </div>
                {editingRules ? (
                  <div className="space-y-3">
                    {rulesText.map((rule, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
                        <span className="text-primary font-semibold text-sm">{index + 1}.</span>
                        <input
                          type="text"
                          value={rule.title}
                          onChange={(e) => updateRule(index, e.target.value)}
                          placeholder="Enter rule"
                          className="flex-1 p-1.5 bg-input border border-border rounded text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          onClick={() => removeRule(index)}
                          className="p-1.5 transition-all active:scale-90 cursor-pointer"
                        >
                          <X className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addRule}
                      className="w-full p-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add Rule
                    </button>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setEditingRules(false); setRulesText(community.rules || []) }}
                        className="p-1.5 transition-all active:scale-90 cursor-pointer"
                        >
                          <X className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </button>
                      <button
                        onClick={handleSaveRules}
                        disabled={savingRules}
                        className="p-1.5 transition-all active:scale-90 cursor-pointer"
                      >
                        {savingRules ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="text-sm text-muted-foreground space-y-2">
                    {(community.rules && community.rules.length > 0) ? (
                      community.rules.map((rule, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-muted-foreground font-semibold">{index + 1}.</span>
                          <span className="text-muted-foreground">{rule.title}</span>
                        </li>
                      ))
                    ) : (
                      <>
                        <li className="text-muted-foreground">No rules have been set for this community.</li>
                      </>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </aside>

          {/* Center - Posts Section */}
          <div className="flex-1 min-w-0">
            {/* Join Requests Section - Only visible to creator */}
            {isCreator && community.pendingRequests && community.pendingRequests.length > 0 && (
              <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg md:text-xl font-bold text-foreground">
                    Pending Join Requests ({community.pendingRequests.length})
                  </h2>
                </div>
                <div className="space-y-3">
                  {community.pendingRequests.map((request) => (
                    <div
                      key={request.user._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/50 rounded-lg p-4 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0">
                          {request.user.avatar ? (
                            <img src={request.user.avatar} alt={request.user.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            request.user.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{request.user.fullName || request.user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            Requested {formatTimeAgo(request.requestedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleJoinRequest(request.user._id, 'approve')}
                          disabled={processingRequest === request.user._id}
                          size="sm"
                          className="gap-2 cursor-pointer"
                        >
                          {processingRequest === request.user._id ? (
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                          {processingRequest === request.user._id ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => handleJoinRequest(request.user._id, 'reject')}
                          disabled={processingRequest === request.user._id}
                          variant="outline"
                          size="sm"
                          className="gap-2 cursor-pointer"
                        >
                          {processingRequest === request.user._id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                          {processingRequest === request.user._id ? 'Processing...' : 'Reject'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sort Controls */}
            <div className="flex items-center justify-start mb-6">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="recent">Most Recent</option>
                <option value="top">Top Rated</option>
                <option value="hot">Hot</option>
              </select>
            </div>

            {/* Posts List */}
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-secondary/20 rounded-lg border border-border">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-4">Be the first to create a post in this community!</p>
                {isMember && (
                  <Link href={`/communities/${params.slug}/new-post`}>
                    <Button className="cursor-pointer">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Post
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Link key={post._id} href={`/communities/${params.slug}/posts/${post._id}`}>
                    <div className="bg-secondary/20 hover:bg-secondary/30 rounded-lg border border-border p-4 transition-colors cursor-pointer">
                      <div className="flex gap-4">
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {post.isPinned && (
                              <Pin className="w-4 h-4 text-primary" />
                            )}
                            {post.isLocked && (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            )}
                            {post.user?.avatar ? (
                              <img 
                                src={post.user?.avatar} 
                                alt={post.user?.username}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <CategoryIcon className="w-4 h-4 text-primary" />
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">
                              u/<span className="font-bold text-primary">{post.user?.username || 'Unknown'}</span> • {formatTimeAgo(post.createdAt)}
                            </span>
                          </div>

                          <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                            {post.title}
                          </h3>

                          {/* Post Media Preview */}
                          <PostMediaPreview images={post.images} videos={post.videos} />

                          {/* Post Stats */}
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              <span>{post.comments?.length || 0} comments</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{post.views || 0} views</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Load More Trigger & Loading State */}
                <div ref={loadMoreRef} className="mt-6 flex justify-center">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading more posts...</span>
                    </div>
                  )}
                  {!loadingMore && !hasMore && posts.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      You've reached the end • {posts.length} posts loaded
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Latest News (Hidden on mobile and small tablets) */}
          <aside className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
            <div className="sticky top-20">
              {/* News Section with Auto-Scroll */}
              <div className="bg-secondary/30 border border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-primary" />
                    Latest News
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Related to {community.relatedEntityName || community.name}
                  </p>
                </div>
                
                {loadingNews ? (
                  <div className="p-8 flex justify-center">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : news.length === 0 ? (
                  <div className="p-8 text-center">
                    <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No recent news found</p>
                    <p className="text-xs text-muted-foreground mt-1">Check back later for updates</p>
                  </div>
                ) : (
                  <div 
                    ref={newsContainerRef}
                    className="h-[500px] overflow-hidden"
                  >
                    <div className="space-y-0">
                      {/* Duplicate news for seamless loop */}
                      {[...news, ...news].map((article, index) => (
                        <a
                          key={index}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="p-4">
                            {article.urlToImage && (
                              <div className="w-full h-32 bg-secondary rounded-lg overflow-hidden mb-3">
                                <img
                                  src={article.urlToImage}
                                  alt={article.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none' }}
                                />
                              </div>
                            )}
                            <h4 className="font-medium text-sm text-foreground line-clamp-2 hover:text-primary transition-colors">
                              {article.title}
                            </h4>
                            {article.description && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {article.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                              <span className="line-clamp-1">{article.source?.name || 'News'}</span>
                              <span>{new Date(article.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                              <ExternalLink className="w-3 h-3" />
                              <span>Read more</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}