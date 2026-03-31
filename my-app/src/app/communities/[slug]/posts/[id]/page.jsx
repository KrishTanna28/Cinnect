"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ThumbsUp, ThumbsDown, MessageCircle, Eye, Pin, Lock, Trash2, Send, Pencil, MoreVertical, Cross2, X, AlertTriangle, ShieldAlert, EyeOff, Share2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/contexts/UserContext"
import { useToast } from "@/hooks/use-toast"
import useInfiniteScroll from "@/hooks/useInfiniteScroll"
import { fetchPosts } from "@/lib/communities/posts.js"
import PostMediaGallery from "@/components/post-media-gallery"
import { PostDetailSkeleton } from "@/components/skeletons"
import { MentionText } from "@/components/mention-text"
import { shouldFilterAdultContent } from "@/lib/utils/ageUtils"
import { CategoryBadge } from "@/components/category-badge"
import UserAvatar from "@/components/user-avatar"

export default function PostDetailPage() {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState("")
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyContent, setReplyContent] = useState("")
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [mentionUser, setMentionUser] = useState(null)
  const [showReplies, setShowReplies] = useState(new Set())
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [commentSpoiler, setCommentSpoiler] = useState(false)
  const [replySpoiler, setReplySpoiler] = useState(false)
  const [revealedSpoilers, setRevealedSpoilers] = useState(new Set())
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)
  const [commentsPage, setCommentsPage] = useState(1)
  const [hasMoreComments, setHasMoreComments] = useState(true)
  const [allComments, setAllComments] = useState([])
  const [showReplyPagination, setShowReplyPagination] = useState({})
  const [updatingPost, setUpdatingPost] = useState(false)
  const [collapsedReplies, setCollapsedReplies] = useState(new Set())
  const [highlightId, setHighlightId] = useState(null)
  const [processedHash, setProcessedHash] = useState(null)
  const viewsIncremented = useRef(false)
  const votingPost = useRef(false)
  const votingComments = useRef(new Set())
  const votingReplies = useRef(new Set())
  const commentTextareaRef = useRef(null)

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
  const searchParams = useSearchParams()
  const { user } = useUser()
  const { toast } = useToast()

  // Auto-focus comment textarea when navigated with ?comment=true
  useEffect(() => {
    if (searchParams.get('comment') === 'true' && !loading && commentTextareaRef.current) {
      commentTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => commentTextareaRef.current?.focus(), 400)
    }
  }, [loading, searchParams])

  useEffect(() => {
    if (!viewsIncremented.current) {
      fetchPost()
      viewsIncremented.current = true
    }
  }, [params.id])

  // Handle Hash Navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash) {
        setProcessedHash(null)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const hash = window.location.hash
    if (!hash || allComments.length === 0) return
    const id = hash.replace('#', '')

    if (processedHash === id) return

    let targetCommentId = null
    for (const c of allComments) {
      if (c._id === id) { targetCommentId = c._id; break }
      if (c.replies && c.replies.some(rep => rep._id === id)) { targetCommentId = c._id; break }
    }

    if (targetCommentId) {
      setProcessedHash(id)

      setShowReplies(prev => {
        const next = new Set(prev)
        next.add(targetCommentId)
        return next
      })

      const targetComment = allComments.find(c => c._id === targetCommentId)
      if (targetComment && targetComment.replies && id !== targetCommentId) {
        setCollapsedReplies(prev => {
          const next = new Set(prev)
          let currentReply = targetComment.replies.find(r => r._id === id)
          while (currentReply && currentReply.parentReplyId) {
            next.delete(currentReply.parentReplyId)
            currentReply = targetComment.replies.find(r => r._id === currentReply.parentReplyId)
          }
          return next
        })
      }

      setHighlightId(id)

      setTimeout(() => {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 300)

      setTimeout(() => {
        setHighlightId(prev => (prev === id ? null : prev))
      }, 3000)
    }
  }, [allComments, processedHash])

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
      const headers = {}
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
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      const response = await fetch(`/api/posts/${params.id}/comment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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
      const response = await fetch(`/api/posts/${params.id}/comment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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

    if (isSubmittingComment) return

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

    setIsSubmittingComment(true)

    // Auto-detect spoiler if checkbox is not checked
    let finalSpoiler = commentSpoiler
    if (!finalSpoiler && commentText.trim().length > 0) {
      try {
        const detectRes = await fetch('/api/spoiler-detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: commentText })
        })
        const detectData = await detectRes.json()
        if (detectData.success) {
          const pct = ((detectData.data?.scores?.spoiler ?? detectData.data?.confidence ?? 0) * 100).toFixed(1)
          console.log(`[Spoiler Detection] Comment: ${pct}% spoiler probability (threshold: 60%)`)
        }
        if (detectData.success && detectData.data?.isSpoiler) {
          finalSpoiler = true
        }
      } catch (detectErr) {
        console.error('Spoiler detection failed, proceeding without:', detectErr)
      }
    }

    // Create optimistic comment
    const tempComment = {
      _id: 'temp-' + Date.now(),
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        fullName: user.fullName
      },
      content: commentText,
      spoiler: finalSpoiler,
      likes: [],
      dislikes: [],
      replies: [],
      createdAt: new Date().toISOString()
    }

    // Store values before clearing
    const contentToSend = commentText
    const spoilerToSend = finalSpoiler

    // Optimistic update - add comment immediately
    setPost(prev => ({
      ...prev,
      comments: [...(prev.comments || []), tempComment],
      commentCount: (prev.commentCount || 0) + 1
    }))

    // Clear form immediately
    setCommentText("")
    setCommentSpoiler(false)

    try {
      const response = await fetch(`/api/posts/${params.id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: contentToSend, spoiler: spoilerToSend })
      })

      const data = await response.json()

      if (data.success) {
        setPost(data.data) // Update with actual server data
      } else {
        // Revert optimistic update on error
        setPost(prev => ({
          ...prev,
          comments: prev.comments.filter(c => c._id !== tempComment._id),
          commentCount: Math.max(0, (prev.commentCount || 1) - 1)
        }))
        toast({
          title: "Error",
          description: data.message || "Failed to add comment",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      // Revert optimistic update on error
      setPost(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c._id !== tempComment._id),
        commentCount: Math.max(0, (prev.commentCount || 1) - 1)
      }))
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleSubmitReply = async (commentId, parentReplyId = null) => {
    if (!user) {
      router.push('/login')
      return
    }

    if (!replyContent.trim() || isSubmittingReply) return

    setIsSubmittingReply(true)

    // Auto-detect spoiler if checkbox is not checked
    let finalSpoiler = replySpoiler
    if (!finalSpoiler && replyContent.trim().length > 0) {
      try {
        const detectRes = await fetch('/api/spoiler-detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: replyContent })
        })
        const detectData = await detectRes.json()
        if (detectData.success) {
          const pct = ((detectData.data?.scores?.spoiler ?? detectData.data?.confidence ?? 0) * 100).toFixed(1)
          console.log(`[Spoiler Detection] Reply: ${pct}% spoiler probability (threshold: 60%)`)
        }
        if (detectData.success && detectData.data?.isSpoiler) {
          finalSpoiler = true
        }
      } catch (detectErr) {
        console.error('Spoiler detection failed, proceeding without:', detectErr)
      }
    }

    // Determine current comment to estimate depth for optimistic UI
    const targetComment = post?.comments?.find(c => c._id === commentId);
    let tempDepth = 0;
    if (parentReplyId && targetComment) {
      const parentRep = targetComment.replies?.find(r => r._id === parentReplyId);
      if (parentRep) {
        tempDepth = Math.min((parentRep.depth || 0) + 1, 5);
      }
    }

    // Create optimistic reply
    const tempReply = {
      _id: 'temp-' + Date.now(),
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        fullName: user.fullName
      },
      content: replyContent,
      spoiler: finalSpoiler,
      parentReplyId,
      depth: tempDepth,
      likes: [],
      dislikes: [],
      createdAt: new Date().toISOString()
    }

    // Store values before clearing
    const contentToSend = replyContent
    const spoilerToSend = finalSpoiler

    // Optimistic update - add reply immediately
    setPost(prev => ({
      ...prev,
      comments: prev.comments.map(c => {
        if (c._id === commentId) {
          return {
            ...c,
            replies: [...(c.replies || []), tempReply]
          }
        }
        return c
      })
    }))

    // Also optimistic update for allComments
    setAllComments(prev => prev.map(c => {
      if (c._id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), tempReply]
        }
      }
      return c
    }))

    // Clear form and show replies immediately
    setReplyContent('')
    setReplySpoiler(false)
    setReplyingTo(null)
    const newShowReplies = new Set(showReplies)
    newShowReplies.add(commentId)
    setShowReplies(newShowReplies)

    try {
      const response = await fetch(`/api/posts/${params.id}/comment/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: contentToSend,
          spoiler: spoilerToSend,
          parentReplyId: parentReplyId
        })
      })

      const data = await response.json()

      if (data.success) {
        setPost(data.data) // Update with actual server data
        setAllComments(data.data.comments || [])
      } else {
        // Revert optimistic update on error
        setPost(prev => ({
          ...prev,
          comments: prev.comments.map(c => {
            if (c._id === commentId) {
              return {
                ...c,
                replies: c.replies.filter(r => r._id !== tempReply._id)
              }
            }
            return c
          })
        }))
        toast({
          title: "Error",
          description: "Failed to submit reply",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to submit reply:', error)
      // Revert optimistic update on error
      setPost(prev => ({
        ...prev,
        comments: prev.comments.map(c => {
          if (c._id === commentId) {
            return {
              ...c,
              replies: c.replies.filter(r => r._id !== tempReply._id)
            }
          }
          return c
        })
      }))
      toast({
        title: "Error",
        description: "Failed to submit reply",
        variant: "destructive"
      })
    } finally {
      setIsSubmittingReply(false)
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
      const response = await fetch(`/api/posts/${params.id}/comment/${commentId}/reply`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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
      const response = await fetch(`/api/posts/${params.id}/comment/${commentId}/reply`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
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
    setDeleting(true)
    try {
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'DELETE',
        headers: {}
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Post deleted successfully"
        })
        setShowDeleteModal(false)
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

  const handleUserNameClick = (e, userId) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!userId) return
    router.push(`/profile/${userId}`)
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/communities/${params.slug}/posts/${params.id}`
    const shareData = {
      title: post?.title || 'Post',
      text: `Check out this post on Cinnect!`,
      url: shareUrl
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        toast({
          title: "Link Copied",
          description: "Post link has been copied to clipboard!"
        })
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error)
      }
    }
  }

  const handleUpdatePost = async () => {
    setUpdatingPost(true)
    try {
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'PATCH',
        headers: {}
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
  const isOwnPost = user && user._id === post.user?._id
  const postSpoilerRevealed = revealedSpoilers.has(post._id)
  const shouldBlurPost = post.spoiler && !postSpoilerRevealed && !isOwnPost

  // Adult content handling
  const isMinor = shouldFilterAdultContent(user)
  const postAdultRevealed = revealedSpoilers.has(`adult_${post._id}`)
  const shouldBlurAdult = post.adult_content && !isOwnPost && !postAdultRevealed

  // Block minors from viewing adult posts entirely
  if (isMinor && post.adult_content) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button onClick={() => router.push(`/communities/${params.slug}`)} className="flex items-center text-sm gap-2 hover:text-primary transition-all active:scale-95 cursor-pointer mb-5">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShieldAlert className="w-16 h-16 text-orange-400 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Age-Restricted Content</h2>
            <p className="text-muted-foreground max-w-md">This post contains adult content and is restricted to users 18 years and older.</p>
          </div>
        </div>
      </main>
    )
  }

  const revealSpoiler = (id) => {
    setRevealedSpoilers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleCollapse = (replyId) => {
    setCollapsedReplies(prev => {
      const next = new Set(prev)
      if (next.has(replyId)) next.delete(replyId)
      else next.add(replyId)
      return next
    })
  }

  const buildReplyTree = (replies) => {
    if (!replies) return [];
    const map = new Map();
    const roots = [];

    replies.forEach(r => {
      map.set(r._id, { ...r, children: [] });
    });

    replies.forEach(r => {
      if (r.parentReplyId && map.has(r.parentReplyId)) {
        map.get(r.parentReplyId).children.push(map.get(r._id));
      } else {
        roots.push(map.get(r._id));
      }
    });

    return roots;
  };

  const renderReplyNode = (replyNode, commentId) => {
    const isOwnReply = user && replyNode.user?._id === user?._id;
    const replySpoilerRevealed = revealedSpoilers.has(replyNode._id);
    const shouldBlurReply = replyNode.spoiler && !replySpoilerRevealed && !isOwnReply;
    const replyAdultRevealed = revealedSpoilers.has(`adult_${replyNode._id}`);
    const shouldBlurAdultReply = replyNode.adult_content && !isOwnReply && !replyAdultRevealed && !isMinor;
    const isCollapsed = collapsedReplies.has(replyNode._id);
    const depth = replyNode.depth || 0;
    const isHighlighted = highlightId === replyNode._id;

    return (
      <div
        key={replyNode._id}
        id={replyNode._id}
        className={`mt-3 flex gap-3 ${depth > 0 ? "pl-4 border-l-2 border-border/50" : ""} ${isHighlighted ? "bg-primary/20 transition-all duration-500 rounded p-1" : "transition-all duration-1000 p-1"}`}
      >
        <div
          className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 cursor-pointer"
          onClick={() => toggleCollapse(replyNode._id)}
        >
          {replyNode.user?.avatar ? (
            <img src={replyNode.user.avatar} alt={replyNode.user.username} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-foreground">
              {replyNode.user?.username?.[0]?.toUpperCase() || '?'}
            </span>
          )}
        </div>

        <div className="flex-1 w-full overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/profile/${replyNode.user?._id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-xs text-foreground hover:text-primary hover:underline"
            >
              {replyNode.user?.username || 'Unknown'}
            </Link>
            <span className="text-xs text-muted-foreground">
              {new Date(replyNode.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </span>

            {isCollapsed && replyNode.children?.length > 0 && (
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full cursor-pointer" onClick={() => toggleCollapse(replyNode._id)}>
                +{replyNode.children.length} replies
              </span>
            )}

            {replyNode.spoiler && (
              isOwnReply ? (
                <span className="px-1.5 py-0.5 bg-destructive/20 text-destructive rounded text-xs font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  SPOILER
                </span>
              ) : (
                <button
                  onClick={() => revealSpoiler(replyNode._id)}
                  className="px-1.5 py-0.5 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  title={replySpoilerRevealed ? "Hide spoiler" : "Contains spoilers"}
                >
                  {replySpoilerRevealed ? <EyeOff className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                  SPOILER {replySpoilerRevealed && <span className="opacity-70">(Revealed)</span>}
                </button>
              )
            )}
            {replyNode.adult_content && (
              <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-semibold flex items-center gap-1">
                <ShieldAlert className="w-2.5 h-2.5" />
                18+
              </span>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex flex-col gap-2">
              {isMinor && replyNode.adult_content ? (
                <p className="text-xs text-muted-foreground italic mb-1">This reply contains age-restricted content.</p>
              ) : (
                <div className="relative">
                  <p className={`text-xs text-foreground mb-1 transition-all break-words ${(shouldBlurReply || shouldBlurAdultReply) ? 'blur-md select-none' : ''}`}>
                    <MentionText text={replyNode.content} />
                  </p>
                  {shouldBlurReply && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={() => revealSpoiler(replyNode._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/90 hover:bg-destructive text-white rounded-lg text-xs font-semibold transition-colors shadow-lg cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        Reveal Spoiler
                      </button>
                    </div>
                  )}
                  {shouldBlurAdultReply && !shouldBlurReply && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={() => revealSpoiler(`adult_${replyNode._id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/90 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        Reveal 18+ Content
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleLikeReply(commentId, replyNode._id)}
                  className={`flex items-center gap-1 text-xs transition-all active:scale-95 cursor-pointer ${replyNode.likes?.some(id => id?.toString() === user?._id)
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                    }`}
                >
                  <ThumbsUp
                    className={`w-3 h-3 ${replyNode.likes?.some(id => id?.toString() === user?._id)
                      ? 'fill-primary text-primary'
                      : ''
                      }`}
                  />
                  {replyNode.likes?.length || 0}
                </button>

                <button
                  onClick={() => handleDislikeReply(commentId, replyNode._id)}
                  className={`flex items-center gap-1 text-xs transition-all active:scale-95 cursor-pointer ${replyNode.dislikes?.some(id => id?.toString() === user?._id)
                    ? 'text-destructive'
                    : 'text-muted-foreground hover:text-destructive'
                    }`}
                >
                  <ThumbsDown
                    className={`w-3 h-3 ${replyNode.dislikes?.some(id => id?.toString() === user?._id)
                      ? 'fill-destructive text-destructive'
                      : ''
                      }`}
                  />
                  {replyNode.dislikes?.length || 0}
                </button>

                {user && !post.isLocked && depth < 5 && (
                  <button
                    onClick={() => {
                      if (replyingTo === replyNode._id) {
                        setReplyingTo(null);
                        setMentionUser(null);
                        setReplyContent("");
                      } else {
                        setReplyingTo(replyNode._id);
                        setMentionUser(replyNode.user?.username);
                        setReplyContent(`@${replyNode.user?.username} `);
                      }
                    }}
                    className="text-xs text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer"
                  >
                    Reply
                  </button>
                )}
              </div>

              {replyingTo === replyNode._id && (
                <div className="mt-2 pl-2 border-l-2 border-primary/20">
                  {mentionUser && (
                    <div className="mb-2 text-xs text-muted-foreground flex items-center">
                      Replying to <span className="text-primary font-semibold ml-1">@{mentionUser}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      autoFocus
                      onFocus={(e) => {
                        const val = e.currentTarget.value;
                        e.currentTarget.value = '';
                        e.currentTarget.value = val;
                      }}
                      placeholder={mentionUser ? `Reply to @${mentionUser}...` : "Write a reply..."}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      className="flex-1 text-xs min-h-[60px]"
                      style={{ borderColor: 'var(--border)' }}
                    />
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        onClick={() => handleSubmitReply(commentId, replyNode._id)}
                        size="sm"
                        disabled={!replyContent.trim() || isSubmittingReply}
                      >
                        {isSubmittingReply && replyingTo === replyNode._id ? (
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                      <X className="w-5 h-5 text-muted-foreground hover:text-destructive cursor-pointer transition-all active:scale-90" onClick={() => setReplyingTo(null)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id={`reply-spoiler-${replyNode._id}`}
                      checked={replySpoiler}
                      onChange={(e) => setReplySpoiler(e.target.checked)}
                      className="w-3 h-3"
                    />
                    <label htmlFor={`reply-spoiler-${replyNode._id}`} className="text-[10px] text-muted-foreground cursor-pointer">
                      Contains Spoilers
                    </label>
                  </div>
                </div>
              )}

              {replyNode.children && replyNode.children.length > 0 && (
                <div className="mt-1">
                  {replyNode.children.map(child => renderReplyNode(child, commentId))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

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
                <UserAvatar
                  src={post.user?.avatar}
                  username={post.user?.username}
                  className="w-8 h-8"
                  fallbackClassName="text-sm"
                />

                {/* Stacked text */}
                <span className="flex flex-col leading-tight">
                  <div>
                    c/<Link
                      href={`/communities/${post.community?.slug || params.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-bold text-primary hover:underline cursor-pointer"
                    >
                      {post.community?.name || 'Unknown'}
                    </Link>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    u/<Link
                      href={`/profile/${post.user?._id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium hover:text-primary hover:underline cursor-pointer"
                    >
                      {post.user?.username || 'Unknown'}
                    </Link>
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
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteModal(true)}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <div className="w-4 h-4 border-2 border-border border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {deleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Title */}
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {post.category && (
                <CategoryBadge
                  category={post.category}
                  customCategory={post.custom_category}
                  categoryColor={post.category_color}
                />
              )}
              {post.spoiler && (
                isOwnPost ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive/20 text-destructive rounded text-xs font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    SPOILER
                  </span>
                ) : (
                  <button
                    onClick={() => revealSpoiler(post._id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors ${postSpoilerRevealed
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "bg-destructive/20 text-destructive hover:bg-destructive/30"
                      }`}
                    title={postSpoilerRevealed ? "Hide spoiler" : "Contains spoilers"}
                  >
                    {postSpoilerRevealed ? <EyeOff className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    SPOILER {postSpoilerRevealed && <span className="opacity-70">(Revealed)</span>}
                  </button>
                )
              )}
              {post.adult_content && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-semibold">
                  <ShieldAlert className="w-3 h-3" />
                  18+ CONTENT
                </span>
              )}
            </div>
            <h1 className={`text-xl font-bold text-foreground mb-4 transition-all ${(shouldBlurPost || shouldBlurAdult) ? 'blur-md select-none' : ''}`}>{post.title}</h1>
          </div>

          {/* Media Gallery (Images + Videos) */}
          <div className={`transition-all ${(shouldBlurPost || shouldBlurAdult) ? 'blur-md select-none pointer-events-none' : ''}`}>
            <PostMediaGallery images={post.images} videos={post.videos} />
          </div>

          {/* Content */}
          {post.content && (
            <div className={`text-muted-foreground whitespace-pre-wrap mb-4 transition-all ${(shouldBlurPost || shouldBlurAdult) ? 'blur-md select-none' : ''}`}>
              <MentionText text={post.content} />
            </div>
          )}

          {/* Spoiler Reveal Button for Post */}
          {shouldBlurPost && (
            <div className="flex justify-center mb-4">
              <button
                onClick={() => revealSpoiler(post._id)}
                className="flex items-center gap-2 px-4 py-2 bg-destructive/90 hover:bg-destructive text-white rounded-lg text-sm font-semibold transition-colors shadow-lg cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                Click to Reveal Spoiler
              </button>
            </div>
          )}

          {/* Adult Content Reveal Button for Post (only for 18+ users) */}
          {shouldBlurAdult && !shouldBlurPost && (
            <div className="flex justify-center mb-4">
              <button
                onClick={() => revealSpoiler(`adult_${post._id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600/90 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                Click to Reveal Adult Content
              </button>
            </div>
          )}

          {/* Post Actions */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-4 border-t border-border">
            <button
              onClick={handleLikePost}
              className={`flex items-center gap-1.5 sm:gap-2 text-sm transition-all active:scale-95 cursor-pointer ${post.likes?.some(id => id?.toString() === user?._id)
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
              className={`flex items-center gap-1.5 sm:gap-2 text-sm transition-all active:scale-95 cursor-pointer ${post.dislikes?.some(id => id?.toString() === user?._id)
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

            <div className="flex items-center gap-1.5 sm:gap-2 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden xs:inline">{post.comments?.length || 0} {post.comments?.length === 1 ? 'Comment' : 'Comments'}</span>
              <span className="xs:hidden">{post.comments?.length || 0}</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span className="hidden xs:inline">{post.views || 0} views</span>
              <span className="xs:hidden">{post.views || 0}</span>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 sm:gap-2 text-sm text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
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
                  ref={commentTextareaRef}
                  placeholder={user ? "What are your thoughts?" : "Login to comment..."}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  disabled={!user || isSubmittingComment}
                  className="flex-1"
                  style={{
                    borderColor: 'var(--border)',
                  }}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!user || isSubmittingComment || !commentText.trim()}
                >
                  {isSubmittingComment ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="comment-spoiler"
                  checked={commentSpoiler}
                  onChange={(e) => setCommentSpoiler(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                <label htmlFor="comment-spoiler" className="text-xs text-muted-foreground cursor-pointer">
                  Contains Spoilers
                </label>
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
              {allComments.map((comment) => {
                const isOwnComment = user && comment.user?._id === user._id
                const commentSpoilerRevealed = revealedSpoilers.has(comment._id)
                const shouldBlurComment = comment.spoiler && !commentSpoilerRevealed && !isOwnComment
                const commentAdultRevealed = revealedSpoilers.has(`adult_${comment._id}`)
                const shouldBlurAdultComment = comment.adult_content && !isOwnComment && !commentAdultRevealed && !isMinor
                const isHighlighted = highlightId === comment._id

                return (
                  <div
                    key={comment._id}
                    id={comment._id}
                    className={`flex gap-3 ${isHighlighted ? "ring-2 ring-primary bg-primary/5 transition-all duration-500 rounded p-2" : "transition-all duration-1000 p-2"}`}
                  >
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
                        <Link
                          href={`/profile/${comment.user?._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-sm text-foreground hover:text-primary hover:underline"
                        >
                          {comment.user?.username || 'Unknown'}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </span>
                        {comment.spoiler && (
                          isOwnComment ? (
                            <span className="px-1.5 py-0.5 bg-destructive/20 text-destructive rounded text-xs font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              SPOILER
                            </span>
                          ) : (
                            <button
                              onClick={() => revealSpoiler(comment._id)}
                              className="px-1.5 py-0.5 bg-destructive/20 hover:bg-destructive/30 text-destructive rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                              title={commentSpoilerRevealed ? "Hide spoiler" : "Contains spoilers"}
                            >
                              {commentSpoilerRevealed ? <EyeOff className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                              SPOILER {commentSpoilerRevealed && <span className="opacity-70">(Revealed)</span>}
                            </button>
                          )
                        )}
                        {comment.adult_content && (
                          <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-semibold flex items-center gap-1">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            18+
                          </span>
                        )}
                      </div>

                      {isMinor && comment.adult_content ? (
                        <p className="text-xs text-muted-foreground italic mb-2">This comment contains age-restricted content.</p>
                      ) : (
                        <div className="relative">
                          <p className={`text-sm text-foreground mb-2 transition-all ${(shouldBlurComment || shouldBlurAdultComment) ? 'blur-md select-none' : ''}`}>
                            <MentionText text={comment.content} />
                          </p>
                          {shouldBlurComment && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <button
                                onClick={() => revealSpoiler(comment._id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/90 hover:bg-destructive text-white rounded-lg text-xs font-semibold transition-colors shadow-lg cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                Reveal Spoiler
                              </button>
                            </div>
                          )}
                          {shouldBlurAdultComment && !shouldBlurComment && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <button
                                onClick={() => revealSpoiler(`adult_${comment._id}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/90 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                Reveal 18+ Content
                              </button>
                            </div>
                          )}
                        </div>
                      )}

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
                            onClick={() => {
                              if (replyingTo === comment._id) {
                                setReplyingTo(null);
                                setMentionUser(null);
                                setReplyContent("");
                              } else {
                                setReplyingTo(comment._id);
                                setMentionUser(comment.user?.username);
                                setReplyContent(`@${comment.user?.username} `);
                              }
                            }}
                            className="text-xs text-muted-foreground hover:text-primary transition-all active:scale-95 cursor-pointer"
                          >
                            Reply
                          </button>
                        )}
                      </div>

                      {/* Reply Form */}
                      {replyingTo === comment._id && (
                        <div className="mt-3">
                          {mentionUser && (
                            <div className="mb-2 text-xs text-muted-foreground flex items-center">
                              Replying to <span className="text-primary font-semibold ml-1">@{mentionUser}</span>
                              <button
                                onClick={() => {
                                  setReplyContent(prev => prev.replace(`@${mentionUser} `, '').replace(`@${mentionUser}`, ''))
                                  setMentionUser(null)
                                }}
                                className="ml-2 text-destructive hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Textarea
                              autoFocus
                              onFocus={(e) => {
                                const val = e.currentTarget.value;
                                e.currentTarget.value = '';
                                e.currentTarget.value = val;
                              }}
                              placeholder={mentionUser ? `Reply to @${mentionUser}...` : "Write a reply..."}
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
                                disabled={!replyContent.trim() || isSubmittingReply}
                              >
                                {isSubmittingReply && replyingTo === comment._id ? (
                                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </Button>
                              <X className="w-6 h-6 text-muted-foreground hover:text-destructive cursor-pointer transition-all active:scale-90" onClick={() => setReplyingTo(null)} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="checkbox"
                              id={`reply-spoiler-${comment._id}`}
                              checked={replySpoiler}
                              onChange={(e) => setReplySpoiler(e.target.checked)}
                              className="w-3.5 h-3.5"
                            />
                            <label htmlFor={`reply-spoiler-${comment._id}`} className="text-xs text-muted-foreground cursor-pointer">
                              Contains Spoilers
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && showReplies.has(comment._id) && (
                        <div className="mt-4 border-l-2 border-border/50 pl-2">
                          {buildReplyTree(comment.replies)
                            .slice(0, showReplyPagination[comment._id] || 3)
                            .map((replyRoot) => renderReplyNode(replyRoot, comment._id))
                          }

                          {/* Load More Replies Button */}
                          {buildReplyTree(comment.replies).length > (showReplyPagination[comment._id] || 3) && (
                            <button
                              onClick={() => loadMoreReplies(comment._id)}
                              className="text-xs text-primary hover:underline ml-9 mt-4"
                            >
                              Load more threads ({buildReplyTree(comment.replies).length - (showReplyPagination[comment._id] || 3)} remaining)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

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

      {/* Delete Post Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-xl bg-background border-border">
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 pt-4 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
