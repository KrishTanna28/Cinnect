"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, X, Upload, Image, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@/contexts/UserContext"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { PostFormSkeleton } from "@/components/skeletons"

export default function NewPostPage() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [imagePreviews, setImagePreviews] = useState([])
  const [videoPreviews, setVideoPreviews] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [community, setCommunity] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to create a post",
        variant: "destructive"
      })
      router.push('/login')
      return
    }
    fetchCommunity()
  }, [user, router])

  const fetchCommunity = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/communities/${params.slug}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      
      if (data.success) {
        if (!data.data.isMember) {
          toast({
            title: "Not a Member",
            description: "You must be a member to create posts",
            variant: "destructive"
          })
          router.push(`/communities/${params.slug}`)
          return
        }
        setCommunity(data.data)
      } else {
        toast({
          title: "Error",
          description: "Failed to load community",
          variant: "destructive"
        })
        router.push('/communities')
      }
    } catch (error) {
      console.error('Error fetching community:', error)
      toast({
        title: "Error",
        description: "Failed to load community",
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

  const handleVideoUpload = (files) => {
    const fileArray = Array.from(files)
    if (videoPreviews.length + fileArray.length > 3) {
      toast({
        title: "Too Many Videos",
        description: "You can upload maximum 3 videos per post",
        variant: "destructive"
      })
      return
    }

    fileArray.forEach((file) => {
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Video must be less than 100MB",
          variant: "destructive"
        })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setVideoPreviews(prev => [...prev, { data: reader.result, name: file.name }])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeVideo = (index) => {
    setVideoPreviews(prev => prev.filter((_, i) => i !== index))
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

    if (!content.trim() && imagePreviews.length === 0 && videoPreviews.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add content, images, or videos to your post",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/communities/${params.slug}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content,
          images: imagePreviews,
          videos: videoPreviews.map(v => v.data)
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Post created successfully!"
        })
        router.push(`/communities/${params.slug}/posts/${data.data._id}`)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create post",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !community) {
    return <PostFormSkeleton />
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Create Post</h1>
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
                  <div key={idx} className="relative group rounded-lg overflow-hidden border-2 border-border aspect-square bg-black/80">
                    <img
                      src={preview}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 z-20 p-1.5 transition-all active:scale-90 cursor-pointer"
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

          {/* Videos */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Videos (Optional)
            </Label>
            
            {/* Video Grid */}
            {videoPreviews.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {videoPreviews.map((video, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border-2 border-border bg-black/80">
                    <video
                      src={video.data}
                      className="w-full aspect-video object-contain"
                      controls
                    />
                    <button
                      type="button"
                      onClick={() => removeVideo(idx)}
                      className="absolute top-2 right-2 z-20 p-1.5 transition-all active:scale-90 cursor-pointer"
                    >
                      <X className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white truncate max-w-[80%]">
                      {video.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Video Upload Button */}
            {videoPreviews.length < 3 && (
              <label className="flex items-center justify-center gap-2 p-6 bg-secondary/20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors">
                <Video className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Click to upload videos ({videoPreviews.length}/3)
                </span>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) => handleVideoUpload(e.target.files)}
                  className="hidden"
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Supported formats: MP4, MOV, WebM. Max 3 videos, 100MB each.
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
              onClick={() => router.back()}
              className="flex-1 sm:flex-initial cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim() || (!content.trim() && imagePreviews.length === 0 && videoPreviews.length === 0)}
              className="flex-1 sm:flex-initial cursor-pointer"
            >
              {submitting ? 'Posting...' : 'Create Post'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
