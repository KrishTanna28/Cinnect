"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Trash2, Plus, Upload, Image as ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@/contexts/UserContext"
import { useToast } from "@/hooks/use-toast"

export default function EditCommunityPage() {
  const [community, setCommunity] = useState(null)
  const [description, setDescription] = useState("")
  const [bannerPreview, setBannerPreview] = useState("")
  const [iconPreview, setIconPreview] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [rulesText, setRulesText] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const params = useParams()
  const router = useRouter()
  const { user, isLoading } = useUser()
  const { toast } = useToast()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to edit a community",
        variant: "destructive"
      })
      router.push('/login')
    }
  }, [user, router, isLoading])

  useEffect(() => {
    fetchCommunity()
  }, [params.slug])

  const fetchCommunity = async () => {
    setLoading(true)
    try {
      const headers = {}

      const response = await fetch(`/api/communities/${params.slug}`, { headers })
      const data = await response.json()

      if (data.success) {
        if (!data.data.isCreator && !data.data.isModerator) {
           toast({
             title: "Access Denied",
             description: "You do not have permission to edit this community",
             variant: "destructive"
           })
           router.push(`/communities/${params.slug}`)
           return
        }

        setCommunity(data.data)
        setDescription(data.data.description || "")
        setIsPrivate(data.data.isPrivate || false)
        setBannerPreview(data.data.banner || "")
        setIconPreview(data.data.icon || "")
        setRulesText(data.data.rules || [])
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

  const handleImageUpload = (type, file) => {
    if (!file) return
    
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result
      if (type === 'banner') {
        setBannerPreview(base64)
      } else {
        setIconPreview(base64)
      }
    }
    reader.readAsDataURL(file)
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!description.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/communities/${params.slug}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          banner: bannerPreview,
          icon: iconPreview,
          isPrivate,
          rules: rulesText
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Community updated successfully!"
        })
        router.push(`/communities/${params.slug}`)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update community",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error updating community:', error)
      toast({
        title: "Error",
        description: "Failed to update community",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </main>
    )
  }

  if (!community) return null

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button 
          variant="ghost" 
          onClick={() => router.push(`/communities/${params.slug}`)}
          className="flex items-center text-sm gap-2 hover:text-primary transition-all active:scale-95 cursor-pointer mb-5"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>

        <h1 className="text-3xl font-bold mb-6">Edit Community Info</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Read-only Name */}
          <div>
            <Label className="text-base font-semibold mb-3 block text-muted-foreground">
              Community Name
            </Label>
            <Input
              value={community.name}
              disabled
              className="text-base bg-secondary/10 opacity-70 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Community names cannot be changed once created.</p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-base font-semibold mb-3 block">
              Description *
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your community is about..."
              required
              rows={4}
              maxLength={500}
              className="w-full p-4 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">{description.length}/500 characters</p>
          </div>

          {/* Banner Image */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Community Banner (Optional)</Label>
            <div className="relative h-48 bg-secondary/20 rounded-lg border-2 border-dashed border-border overflow-hidden">
              {bannerPreview ? (
                <>
                  <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setBannerPreview("")}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-2 cursor-pointer transition-all active:scale-90"
                  >
                    <X className="w-4 h-4 text-white hover:text-primary" />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-secondary/40 transition-colors">
                  <Upload className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to upload banner (1200x300 recommended)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload('banner', e.target.files[0])}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Icon Image */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Community Icon (Optional)</Label>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 bg-secondary/20 rounded-full border-2 border-dashed border-border overflow-hidden flex-shrink-0">
                {iconPreview ? (
                  <>
                    <img src={iconPreview} alt="Icon" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setIconPreview("")}
                      className="absolute top-2 right-2 bg-black/60 rounded-full p-1 cursor-pointer transition-all active:scale-90"
                    >
                      <X className="w-3 h-3 text-white hover:text-primary" />
                    </button>
                  </>
                ) : (
                  <label className="flex items-center justify-center h-full cursor-pointer hover:bg-secondary/40 transition-colors">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload('icon', e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Square image (256x256 recommended)</p>
            </div>
          </div>

          {/* Rules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold block m-0">
                Community Rules
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRule}
                className="cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>
            
            {rulesText.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-secondary/10 p-4 rounded-lg text-center">No rules added yet.</p>
            ) : (
              <div className="space-y-3">
                {rulesText.map((rule, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={rule.title}
                      onChange={(e) => updateRule(index, e.target.value)}
                      placeholder={`Rule ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => removeRule(index)}
                      className="flex-shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg border border-border">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-5 h-5 rounded border-border cursor-pointer accent-primary"
            />
            <div>
              <Label htmlFor="private" className="font-semibold text-foreground cursor-pointer text-base">
                Private Community
              </Label>
              <p className="text-sm text-muted-foreground">Only approved members can view and post</p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-6 border-t border-border mt-8">
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
              disabled={submitting || !description.trim()}
              className="flex-1 sm:flex-initial cursor-pointer"
            >
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
