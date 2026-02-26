"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, X, Upload, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@/contexts/UserContext"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { fetchPosts } from "@/lib/communities/posts.js"
import { PostFormSkeleton } from "@/components/skeletons"

export default function EditPostPage() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [imagePreviews, setImagePreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [community, setCommunity] = useState(null)
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to edit a post",
        variant: "destructive"
      })
      router.push('/login')
      return
    }
    fetchPostAndCommunity()
  }, [user, router])

  const fetchPostAndCommunity = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch post
      const postData = await fetchPosts(params.id)
      
      if (!postData.success) {
        toast({
          title: "Error",
          description: "Failed to load post",
          variant: "destructive"
        })
        router.push('/communities')
        return
      }

      const postContent = postData.data

      // Check if user can edit
      if (postContent.user?._id !== user._id && !postContent.community?.moderators?.includes(user._id)) {
        toast({
          title: "Unauthorized",
          description: "You don't have permission to edit this post",
          variant: "destructive"
        })
        router.push(`/communities/${params.slug}/posts/${params.id}`)
        return
      }

      setPost(postContent)
      setTitle(postContent.title || "")
      setContent(postContent.content || "")
      setImagePreviews(postContent.images || [])

      // Fetch community
      const response = await fetch(`/api/communities/${params.slug}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const communityData = await response.json()
      
      if (communityData.success) {
        setCommunity(communityData.data)
      }
    } catch (error) {
      console.error('Error fetching post:', error)
      toast({
        title: "Error",
        description: "Failed to load post",
        variant: "destructive"
      })
      router.push('/communities')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (files) => {
    const fileArray = Array.from(files)
    if (imagePreviews.length + fileArray.length > 10) {
      toast({
        title: "Too Many Images",
        description: "You can upload maximum 10 images per post",
        variant: "destructive"
      })
      return
    }

    fileArray.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a title",
        variant: "destructive"
      })
      return
    }

    if (!content.trim() && imagePreviews.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add content or images to your post",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content,
          images: imagePreviews
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Post updated successfully!"
        })
        router.push(`/communities/${params.slug}/posts/${params.id}`)
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
      setSubmitting(false)
    }
  }

  if (loading || !community || !post) {
    return <PostFormSkeleton />
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Edit Post</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-base font-semibold mb-3 block">
              Title *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title..."
              maxLength={500}
              required
              className="text-base"
            />
            <p className="text-xs text-muted-foreground mt-1">{title.length}/500 characters</p>
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content" className="text-base font-semibold mb-3 block">
              Content
            </Label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts, opinions, or questions..."
              rows={8}
              maxLength={10000}
              className="w-full p-4 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">{content.length}/10000 characters</p>
          </div>

          {/* Images */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Images (Optional)
            </Label>
            
            {/* Image Grid */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                {imagePreviews.map((preview, idx) => (
                  <div key={idx} className="relative group aspect-square">
                    <img
                      src={preview}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg border-2 border-border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 p-1.5 transition-all active:scale-90 cursor-pointer"
                    >
                      <X className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {imagePreviews.length < 10 && (
              <label className="flex items-center justify-center gap-2 p-6 bg-secondary/20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Click to upload images ({imagePreviews.length}/10)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Supported formats: JPG, PNG, GIF. Max 10 images per post.
            </p>
          </div>

          {/* Guidelines */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h3 className="font-semibold text-foreground mb-2">Community Guidelines</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Be respectful to other members</li>
              <li>Stay on topic related to {community.name}</li>
              <li>No spam or self-promotion without permission</li>
              <li>No hate speech, harassment, or illegal content</li>
            </ul>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/communities/${params.slug}/posts/${params.id}`)}
              className="flex-1 sm:flex-initial cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim() || (!content.trim() && imagePreviews.length === 0)}
              className="flex-1 sm:flex-initial cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
