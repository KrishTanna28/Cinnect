"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ThumbsUp, ThumbsDown, MessageCircle, Eye, Pin, Lock, Trash2, Send, Pencil, MoreVertical, Cross2, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/contexts/UserContext"
import { useToast } from "@/hooks/use-toast"
import useInfiniteScroll from "@/hooks/useInfiniteScroll"
import { fetchPosts } from "@/lib/communities/posts.js"
import PostMediaGallery from "@/components/post-media-gallery"
import { PostDetailSkeleton } from "@/components/skeletons"

export default function PostDetailPage() {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState("")
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyContent, setReplyContent] = useState("")
  const [showReplies, setShowReplies] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)
  const [commentsPage, setCommentsPage] = useState(1)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [allComments, setAllComments] = useState([])
  const [showReplyPagination, setShowReplyPagination] = useState({})
  const [updatingPost, setUpdatingPost] = useState(false)
  const viewsIncremented = useRef(false)
  const votingPost = useRef(false)
  const votingComments = useRef(new Set())
  const votingReplies = useRef(new Set())

  // Infinite scroll for comments
  const loadMoreCommentsRef = useInfiniteScroll(
    () => {
      if (hasMoreComments && !loadingMoreComments) {
        loadMoreComments()
      }
    },
    hasMoreComments,
    loadingMoreComments
  )

  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()

  useEffect(() => {
    if (!viewsIncremented.current) {
      fetchPost()
      viewsIncremented.current = true
    }
  }, [params.id])

  const fetchPost = async () => {
    setLoading(true)
    try {
      const data = await fetchPosts(params.id);

      if (data.success) {
        setPost(data.data)
        setAllComments(data.data.comments || [])
        setCommentsPage(1)
        setHasMoreComments(data.data.totalComments > 10)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to load post",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching post:', error)
      toast({
        title: "Error",
        description: "Failed to load post",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMoreComments = async () => {
    if (!hasMoreComments || loadingMoreComments) return

    setLoadingMoreComments(true)
    try {
      const token = localStorage.getItem('token')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      const nextPage = commentsPage + 1

      const response = await fetch(`/api/posts/${params.id}?commentsPage=${nextPage}&commentsLimit=10`, { headers })
      const data = await response.json()

      if (data.success) {
        setAllComments(prev => [...prev, ...(data.data.comments || [])])
        setCommentsPage(nextPage)
        setHasMoreComments(data.data.totalComments > allComments.length + (data.data.comments || []).length)
      }
    } catch (error) {
      console.error('Error loading more comments:', error)
    } finally {
      setLoadingMoreComments(false)
    }
  }

  const loadMoreReplies = (commentId) => {
    setShowReplyPagination(prev => ({
      ...prev,
      [commentId]: (prev[commentId] || 3) + 5
    }))
  }

  const handleLikePost = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (votingPost.current) return
    votingPost.current = true

    // Optimistic update
    setPost(prev => {
      if (!prev) return prev
      const userLiked = prev.likes?.some(id => id?.toString() === user._id)
      const userDisliked = prev.dislikes?.some(id => id?.toString() === user._id)

      return {
        ...prev,
        likes: userLiked
          ? (prev.likes || []).filter(id => id?.toString() !== user._id)
          : [...(prev.likes || []), user._id],
        dislikes: userDisliked
          ? (prev.dislikes || []).filter(id => id?.toString() !== user._id)
          : prev.dislikes || []
      }
    })

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'like' })
      })

      const data = await response.json()

      if (!data.success) {
        // Revert optimistic update on error
        fetchPost()
      }
    } catch (error) {
      console.error('Failed to like post:', error)
      // Revert optimistic update on error
      fetchPost()
    } finally {
      votingPost.current = false
    }
  }

  const handleDislikePost = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (votingPost.current) return
    votingPost.current = true

    // Optimistic update
    setPost(prev => {
      if (!prev) return prev
      const userLiked = prev.likes?.some(id => id?.toString() === user._id)
      const userDisliked = prev.dislikes?.some(id => id?.toString() === user._id)

      return {
        ...prev,
        likes: userLiked
          ? (prev.likes || []).filter(id => id?.toString() !== user._id)
          : prev.likes || [],
        dislikes: userDisliked
          ? (prev.dislikes || []).filter(id => id?.toString() !== user._id)
          : [...(prev.dislikes || []), user._id]
      }
    })

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'dislike' })
      })

      const data = await response.json()

      if (!data.success) {
        // Revert optimistic update on error
        fetchPost()
      }
    } catch (error) {
      console.error('Failed to dislike post:', error)
      // Revert optimistic update on error
      fetchPost()
    } finally {
      votingPost.current = false
    }
  }

  const handleLikeComment = async (commentId) => {
    if (!user) {
      router.push('/login')
      return
    }

    if (votingComments.current.has(commentId)) return
    votingComments.current.add(commentId)

    // Optimistic update - update allComments for immediate UI update
    setAllComments(prev => prev.map(comment => {
      if (comment._id === commentId) {
        const userLiked = comment.likes?.some(id => id?.toString() === user._id)
        const userDisliked = comment.dislikes?.some(id => id?.toString() === user._id)
        return {
          ...comment,
          likes: userLiked
            ? (comment.likes || []).filter(id => id?.toString() !== user._id)
            : [...(comment.likes || []), user._id],
          dislikes: userDisliked
            ? (comment.dislikes || []).filter(id => id?.toString() !== user._id)
            : comment.dislikes || []
        }
      }
      return comment
    }))

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${params.id}/comment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ commentId, action: 'like' })
      })

      const data = await response.json()

      if (!data.success) {
        // Revert optimistic update on error
        fetchPost()
      }
    } catch (error) {
      console.error('Failed to like comment:', error)
      // Revert optimistic update on error
      fetchPost()
    } finally {
      votingComments.current.delete(commentId)
    }
  }

  const handleDislikeComment = async (commentId) => {
    if (!user) {
      router.push('/login')
      return
    }

    if (votingComments.current.has(commentId)) return
    votingComments.current.add(commentId)

    // Optimistic update - update allComments for immediate UI update
    setAllComments(prev => prev.map(comment => {
      if (comment._id === commentId) {
        const userLiked = comment.likes?.some(id => id?.toString() === user._id)
        const userDisliked = comment.dislikes?.some(id => id?.toString() === user._id)
        return {
          ...comment,
          likes: userLiked
            ? (comment.likes || []).filter(id => id?.toString() !== user._id)
            : comment.likes || [],
          dislikes: userDisliked
            ? (comment.dislikes || []).filter(id => id?.toString() !== user._id)
            : [...(comment.dislikes || []), user._id]
        }
      }
      return comment
    }))

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${params.id}/comment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ commentId, action: 'dislike' })
      })

      const data = await response.json()

      if (!data.success) {
        // Revert optimistic update on error
        fetchPost()
      }
    } catch (error) {
      console.error('Failed to dislike comment:', error)
      // Revert optimistic update on error
      fetchPost()
    } finally {
      votingComments.current.delete(commentId)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to comment",
        variant: "destructive"
      })
      router.push('/login')
      return
    }

    if (!commentText.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a comment",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${params.id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: commentText })
      })

      const data = await response.json()

      if (data.success) {
        setCommentText("")
        setPost(data.data) // Update with the new comment
        toast({
          title: "Success",
          description: "Comment added successfully"
        })
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to add comment",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (commentId) => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!replyContent.trim()) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${params.id}/comment/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: replyContent })
      })

      const data = await response.json()

      if (data.success) {
        setReplyContent('')
        setReplyingTo(null)
        setPost(data.data)
        const newShowReplies = new Set(showReplies)
        newShowReplies.add(commentId)
        setShowReplies(newShowReplies)
        toast({
          title: "Success",
          description: "Reply added successfully"
        })
      }
    } catch (error) {
      console.error('Failed to submit reply:', error)
      toast({
        title: "Error",
        description: "Failed to submit reply",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleLikeReply = async (commentId, replyId) => {
    if (!user) {
      router.push('/login')
      return
    }

    const key = `${commentId}-${replyId}`
    if (votingReplies.current.has(key)) return
    votingReplies.current.add(key)

    // Optimistic update - update allComments for immediate UI update
    setAllComments(prev => prev.map(comment => {
      if (comment._id === commentId) {
        return {
          ...comment,
          replies: comment.replies.map(reply => {
            if (reply._id === replyId) {
              const userLiked = reply.likes?.some(id => id?.toString() === user._id)
              const userDisliked = reply.dislikes?.some(id => id?.toString() === user._id)
              return {
                ...reply,
                likes: userLiked
                  ? (reply.likes || []).filter(id => id?.toString() !== user._id)
                  : [...(reply.likes || []), user._id],
                dislikes: userDisliked
                  ? (reply.dislikes || []).filter(id => id?.toString() !== user._id)
                  : reply.dislikes || []
              }
            }
            return reply
          })
        }
      }
      return comment
    }))

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${params.id}/comment/${commentId}/reply`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ replyId, action: 'like' })
      })

      const data = await response.json()

      if (!data.success) {
        fetchPost()
      }
    } catch (error) {
      console.error('Failed to like reply:', error)
      fetchPost()
    } finally {
      votingReplies.current.delete(key)
    }
  }

  const handleDislikeReply = async (commentId, replyId) => {
    if (!user) {
      router.push('/login')
      return
    }

    const key = `${commentId}-${replyId}`
    if (votingReplies.current.has(key)) return
    votingReplies.current.add(key)

    // Optimistic update - update allComments for immediate UI update
    setAllComments(prev => prev.map(comment => {
      if (comment._id === commentId) {
        return {
          ...comment,
          replies: comment.replies.map(reply => {
            if (reply._id === replyId) {
              const userLiked = reply.likes?.some(id => id?.toString() === user._id)
              const userDisliked = reply.dislikes?.some(id => id?.toString() === user._id)
              return {
                ...reply,
                likes: userLiked
                  ? (reply.likes || []).filter(id => id?.toString() !== user._id)
                  : reply.likes || [],
                dislikes: userDisliked
                  ? (reply.dislikes || []).filter(id => id?.toString() !== user._id)
                  : [...(reply.dislikes || []), user._id]
              }
            }
            return reply
          })
        }
      }
      return comment
    }))

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${params.id}/comment/${commentId}/reply`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ replyId, action: 'dislike' })
      })

      const data = await response.json()

      if (!data.success) {
        fetchPost()
      }
    } catch (error) {
      console.error('Failed to dislike reply:', error)
      fetchPost()
    } finally {
      votingReplies.current.delete(key)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Post deleted successfully"
        })
        router.push(`/communities/${params.slug}`)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete post",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleUpdatePost = async () => {
    setUpdatingPost(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Post updated successfully"
        })
        router.push(`/communities/${params.slug}`)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update post",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error updating post:', error)
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive"
      })
    } finally {
      setUpdatingPost(false)
    }
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

  if (loading) {
    return <PostDetailSkeleton />
  }

  if (!post) {
    return (
      <NotFound />
    )
  }

  const canDelete = user && (user._id === post.user?._id || post.community?.moderators?.includes(user._id))

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-sm gap-2 hover:text-primary transition-all active:scale-95 cursor-pointer mb-5"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
        {/* Post Card */}
        <div className="bg-secondary/20 rounded-lg border border-border p-6 mb-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              {post.isPinned && (
                <Pin className="w-4 h-4 text-primary" />
              )}
              {post.isLocked && (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="flex items-center gap-3">
                {/* User avatar */}
                <img
                  src={post.user?.avatar || '/default-avatar.png'}
                  alt={post.user?.username || 'User'}
                  className="w-8 h-8 rounded-full object-cover"
                />

                {/* Stacked text */}
                <span className="flex flex-col leading-tight">
                  <div>
                    c/<span className="font-bold text-primary">
                      {post.community?.name || 'Unknown'}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    u/<span className="font-medium">
                      {post.user?.username || 'Unknown'}
                    </span>
                    {' • '}
                    {formatTimeAgo(post.createdAt)}
                  </div>
                </span>
              </span>

            </div>

            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer p-1 transition-all active:scale-90 hover:text-primary">
                    <MoreVertical className="w-4 h-4 hover:text-primary" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/communities/${params.slug}/posts/${post._id}/edit`)}>
                    <Pencil className="w-4 h-4" />
                    Edit Post
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <div className="w-4 h-4 border-2 border-border border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {deleting ? "Deleting..." : "Delete Post"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-foreground mb-4">{post.title}</h1>

          {/* Media Gallery (Images + Videos) */}
          <PostMediaGallery images={post.images} videos={post.videos} />

          {/* Content */}
          {post.content && (
            <div className="text-muted-foreground whitespace-pre-wrap mb-4">
              {post.content}
            </div>
          )}

          {/* Post Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <button
              onClick={handleLikePost}
              className={`flex items-center gap-2 text-sm transition-all active:scale-95 cursor-pointer ${post.likes?.some(id => id?.toString() === user?._id)
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-primary"
                }`}
            >
              <ThumbsUp
                className={`w-4 h-4 ${post.likes?.some(id => id?.toString() === user?._id)
                  ? "fill-primary text-primary"
                  : ""
                  }`}
              />
              <span>{post.likes?.length || 0}</span>
            </button>

            <button
              onClick={handleDislikePost}
              className={`flex items-center gap-2 text-sm transition-all active:scale-95 cursor-pointer ${post.dislikes?.some(id => id?.toString() === user?._id)
                ? "text-destructive"
                : "text-muted-foreground hover:text-destructive"
                }`}
            >
              <ThumbsDown
                className={`w-4 h-4 ${post.dislikes?.some(id => id?.toString() === user?._id)
                  ? "fill-destructive text-destructive"
                  : ""
                  }`}
              />
              <span>{post.dislikes?.length || 0}</span>
            </button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments?.length || 0} {post.comments?.length === 1 ? 'Comment' : 'Comments'}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span>{post.views || 0} views</span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-secondary/20 rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Comments ({post.comments?.length || 0})
          </h2>

          {/* Add Comment Form */}
          {!post.isLocked && (
            <form onSubmit={handleAddComment} className="mb-6">
              <div className="flex gap-2">
                <Textarea
                  placeholder={user ? "What are your thoughts?" : "Login to comment..."}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  disabled={!user || submitting}
                  className="flex-1"
                  style={{
                    borderColor: 'var(--border)',
                  }}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!user || submitting || !commentText.trim()}
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          )}

          {post.isLocked && (
            <div className="p-4 bg-secondary/40 rounded-lg border border-border mb-6 flex items-center gap-2 text-muted-foreground">
              <Lock className="w-5 h-5" />
              <span>This post is locked. New comments cannot be added.</span>
            </div>
          )}

          {/* Comments List */}
          {allComments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allComments.map((comment) => (
                <div key={comment._id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    {comment.user?.avatar ? (
                      <img src={comment.user.avatar} alt={comment.user.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-foreground">
                        {comment.user?.username?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-foreground">{comment.user?.username || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-sm text-foreground mb-2">{comment.content}</p>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleLikeComment(comment._id)}
                        className={`flex items-center gap-1 text-xs transition-all active:scale-95 cursor-pointer ${comment.likes?.some(id => id?.toString() === user?._id)
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-primary'
                          }`}
                      >
                        <ThumbsUp
                          className={`w-3 h-3 ${comment.likes?.some(id => id?.toString() === user?._id)
                            ? 'fill-primary text-primary'
                            : ''
                            }`}
                        />
                        {comment.likes?.length || 0}
                      </button>

                      <button
                        onClick={() => handleDislikeComment(comment._id)}
                        className={`flex items-center gap-1 text-xs transition-all active:scale-95 cursor-pointer ${comment.dislikes?.some(id => id?.toString() === user?._id)
                          ? 'text-destructive'
                          : 'text-muted-foreground hover:text-destructive'
                          }`}
                      >
                        <ThumbsDown
                          className={`w-3 h-3 ${comment.dislikes?.some(id => id?.toString() === user?._id)
                            ? 'fill-destructive text-destructive'
                            : ''
                            }`}
                        />
                        {comment.dislikes?.length || 0}
                      </button>

                      <button
                        onClick={() => {
                          const newShowReplies = new Set(showReplies)
                          if (newShowReplies.has(comment._id)) {
                            newShowReplies.delete(comment._id)
                          } else {
                            newShowReplies.add(comment._id)
                          }
                          setShowReplies(newShowReplies)
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3" />
                        {comment.replies?.length || 0} {comment.replies?.length === 1 ? 'Reply' : 'Replies'}
                      </button>

                      {user && !post.isLocked && (
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                          className="text-xs text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer"
                        >
                          Reply
                        </button>
                      )}
                    </div>

                    {/* Reply Form */}
                    {replyingTo === comment._id && (
                      <div className="mt-3">
                        <div className="flex gap-2">
                          <Textarea
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={2}
                            className="flex-1"
                            style={{
                              borderColor: 'var(--border)',
                            }}
                          />
                          <div className="flex flex-col items-center gap-2">                          
                            <Button
                            onClick={() => handleSubmitReply(comment._id)}
                            size="sm"
                            disabled={!replyContent.trim() || submitting}
                          >
                            {submitting && replyingTo === comment._id ? (
                              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                            <X className="w-6 h-6 text-muted-foreground hover:text-destructive cursor-pointer transition-all active:scale-90" onClick={() => setReplyingTo(null)} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && showReplies.has(comment._id) && (
                      <div className="mt-4 space-y-3 pl-4 border-l-2 border-border">
                        {comment.replies.slice(0, showReplyPagination[comment._id] || 3).map((reply) => (
                          <div key={reply._id} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                              {reply.user?.avatar ? (
                                <img src={reply.user.avatar} alt={reply.user.username} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-foreground">
                                  {reply.user?.username?.[0]?.toUpperCase() || '?'}
                                </span>
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-xs text-foreground">{reply.user?.username || 'Unknown'}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(reply.createdAt).toLocaleDateString()}
                                </span>
                              </div>

                              <p className="text-xs text-foreground mb-2">{reply.content}</p>

                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleLikeReply(comment._id, reply._id)}
                                  className={`flex items-center gap-1 text-xs transition-all active:scale-95 cursor-pointer ${reply.likes?.some(id => id?.toString() === user?._id)
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-primary'
                                    }`}
                                >
                                  <ThumbsUp
                                    className={`w-3 h-3 ${reply.likes?.some(id => id?.toString() === user?._id)
                                      ? 'fill-primary text-primary'
                                      : ''
                                      }`}
                                  />
                                  {reply.likes?.length || 0}
                                </button>

                                <button
                                  onClick={() => handleDislikeReply(comment._id, reply._id)}
                                  className={`flex items-center gap-1 text-xs transition-all active:scale-95 cursor-pointer ${reply.dislikes?.some(id => id?.toString() === user?._id)
                                    ? 'text-destructive'
                                    : 'text-muted-foreground hover:text-destructive'
                                    }`}
                                >
                                  <ThumbsDown
                                    className={`w-3 h-3 ${reply.dislikes?.some(id => id?.toString() === user?._id)
                                      ? 'fill-destructive text-destructive'
                                      : ''
                                      }`}
                                  />
                                  {reply.dislikes?.length || 0}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* Load More Replies Button */}
                        {comment.replies.length > (showReplyPagination[comment._id] || 3) && (
                          <button
                            onClick={() => loadMoreReplies(comment._id)}
                            className="text-xs text-primary hover:underline ml-9 mt-2"
                          >
                            Load {Math.min(5, comment.replies.length - (showReplyPagination[comment._id] || 3))} more {comment.replies.length - (showReplyPagination[comment._id] || 3) === 1 ? 'reply' : 'replies'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Load More Comments */}
              <div ref={loadMoreCommentsRef} className="mt-6 flex justify-center">
                {loadingMoreComments && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading more comments...</span>
                  </div>
                )}
                {!loadingMoreComments && !hasMoreComments && allComments.length > 0 && (
                  <p className="text-muted-foreground text-sm">
                    All comments loaded • {allComments.length} total
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
