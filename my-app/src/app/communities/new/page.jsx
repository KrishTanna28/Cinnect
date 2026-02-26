"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Film, Tv, User, Sparkles, X, Search, Upload, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@/contexts/UserContext"
import { useToast } from "@/hooks/use-toast"

const categories = [
  { id: 'general', label: 'General', icon: Sparkles, description: 'Community about general topics' },
  { id: 'movie', label: 'Movie', icon: Film, description: 'Community about a specific movie or movies in general' },
  { id: 'tv', label: 'TV Show', icon: Tv, description: 'Community about a TV series or TV shows in general' },
  { id: 'actor', label: 'Actor/Cast', icon: User, description: 'Community about actors, directors, or crew members' }
]

export default function NewCommunityPage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("general")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bannerPreview, setBannerPreview] = useState("")
  const [iconPreview, setIconPreview] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  
  const router = useRouter()
  const { user, isLoading } = useUser()
  const { toast } = useToast()

  useEffect(() => {
    if(isLoading) return
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to create a community",
        variant: "destructive"
      })
      router.push('/login')
    }
  }, [user, router])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) return

    const debounceTimer = setTimeout(() => {
      handleSearch()
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, category])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      let endpoint = ''
      if (category === 'movie') {
        endpoint = `/api/movies/search?query=${encodeURIComponent(searchQuery)}`
      } else if (category === 'tv') {
        endpoint = `/api/movies/tv/search?query=${encodeURIComponent(searchQuery)}`
      } else if (category === 'actor') {
        endpoint = `/api/movies/person/search?query=${encodeURIComponent(searchQuery)}`
      }

      if (endpoint) {
        const response = await fetch(endpoint)
        const data = await response.json()
        setSearchResults(data.data?.results || [])
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  const selectEntity = (entity) => {
    setSelectedEntity({
      id: entity.id,
      name: entity.title || entity.name,
      image: entity.poster || entity.profilePicture || '',
      type: category
    })
    setSearchResults([])
    setSearchQuery("")
    
    // Auto-fill name if empty
    if (!name) {
      setName(`${entity.title || entity.name} Fan Community`)
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim() || !description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          description,
          category,
          relatedEntityId: selectedEntity?.id,
          relatedEntityName: selectedEntity?.name,
          relatedEntityType: selectedEntity?.type,
          banner: bannerPreview,
          icon: iconPreview,
          isPrivate
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Community created successfully!"
        })
        router.push(`/communities/${data.data.slug}`)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to create community",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error creating community:', error)
      toast({
        title: "Error",
        description: "Failed to create community",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-6">Create Community</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Community Name */}
          <div>
            <Label htmlFor="name" className="text-base font-semibold mb-3 block">
              Community Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a unique name for your community..."
              maxLength={50}
              required
              className="text-base"
            />
            <p className="text-xs text-muted-foreground mt-1">{name.length}/50 characters</p>
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

          {/* Category Selection */}
          <div>
            <Label htmlFor="category" className="text-base font-semibold mb-3 block">
              Category
            </Label>
            <select
              id="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setSelectedEntity(null)
                setSearchResults([])
              }}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label} - {cat.description}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Search (for movie, tv, actor) */}
          {(category === 'movie' || category === 'tv' || category === 'actor') && (
            <div>
              <Label className="text-base font-semibold mb-3 block">
                Link to {category === 'movie' ? 'Movie' : category === 'tv' ? 'TV Show' : 'Actor'} (Optional)
              </Label>
              
              {!selectedEntity ? (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search for ${category === 'movie' ? 'a movie' : category === 'tv' ? 'a TV show' : 'an actor'}...`}
                      className="pl-10"
                    />
                  </div>

                  {searching && (
                    <p className="text-sm text-muted-foreground">Searching...</p>
                  )}

                  {searchResults.length > 0 && (
                    <div className="bg-secondary/20 rounded-lg border border-border max-h-60 overflow-y-auto">
                      {searchResults.slice(0, 5).map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => selectEntity(result)}
                          className="flex items-center gap-3 p-3 hover:bg-secondary/40 transition-colors w-full text-left border-b border-border last:border-0 cursor-pointer"
                        >
                          {(result.poster || result.profilePicture) && (
                            <img
                              src={result.poster || result.profilePicture}
                              alt={result.title || result.name}
                              className="w-12 h-16 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-foreground">{result.title || result.name}</p>
                            {result.releaseDate && (
                              <p className="text-xs text-muted-foreground">{result.releaseDate?.split('-')[0]}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg border border-border">
                  {selectedEntity.image && (
                    <img
                      src={selectedEntity.image}
                      alt={selectedEntity.name}
                      className="w-12 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{selectedEntity.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEntity(null)}
                    className="p-1 cursor-pointer transition-all active:scale-90"
                  >
                    <X className="w-5 h-5 text-muted-foreground hover:text-primary" />
                  </button>
                </div>
              )}
            </div>
          )}

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
                    className="absolute top-2 right-2 p-2 cursor-pointer transition-all active:scale-90"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-primary" />
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
                    className="absolute top-2 right-2 p-2 cursor-pointer transition-all active:scale-90"
                    >
                      <X className="w-3 h-3 hover:text-primary" />
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

          {/* Privacy Setting */}
          <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg border border-border">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-5 h-5 rounded border-border cursor-pointer"
            />
            <div>
              <Label htmlFor="private" className="font-semibold text-foreground cursor-pointer">
                Private Community
              </Label>
              <p className="text-xs text-muted-foreground">Only approved members can view and post</p>
            </div>
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
              disabled={submitting || !name.trim() || !description.trim()}
              className="flex-1 sm:flex-initial cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create Community'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
