"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Lock,
  Globe,
  Bell,
  Shield,
  Eye,
  Loader2,
  UserCheck,
  User,
  Camera,
  Palette,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  Save,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@/contexts/UserContext"
import { useToast } from "@/hooks/use-toast"

const GENRE_OPTIONS = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
  "Drama", "Family", "Fantasy", "History", "Horror", "Music",
  "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western"
]

const SIDEBAR_SECTIONS = [
  { id: "edit-profile", label: "Edit Profile", icon: User, group: "account" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "account" },
  { id: "privacy", label: "Account Privacy", icon: Lock, group: "privacy" },
  { id: "follow-requests", label: "Follow Requests", icon: UserCheck, group: "privacy" },
  { id: "appearance", label: "Appearance", icon: Palette, group: "preferences" },
]

export default function SettingsPage() {
  const router = useRouter()
  const { user, isLoading, updateUser, logout } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef(null)

  const [activeSection, setActiveSection] = useState("edit-profile")

  const [settings, setSettings] = useState({
    isPrivate: false,
    notifications: {
      email: true,
      push: true,
      watchPartyInvites: true,
      newReviews: true
    },
    theme: "dark"
  })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit profile state
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    bio: "",
    favoriteGenres: []
  })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  // Follow requests state
  const [followRequests, setFollowRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [processingIds, setProcessingIds] = useState(new Set())

  // Mobile sidebar open
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
      return
    }
    if (user) {
      fetchSettings()
      setProfileForm({
        fullName: user.fullName || "",
        bio: user.bio || "",
        favoriteGenres: user.preferences?.favoriteGenres || []
      })
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (settings.isPrivate && activeSection === "follow-requests") {
      fetchFollowRequests()
    }
  }, [settings.isPrivate, activeSection])

  // ---------- API calls ----------

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/users/me/settings", {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSettings(data.data)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setSettingsLoading(false)
    }
  }

  const updateSettings = async (key, value) => {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const body = {}

      if (key === "isPrivate") {
        body.isPrivate = value
      } else if (key.startsWith("notifications.")) {
        const notifKey = key.split(".")[1]
        body.notifications = { [notifKey]: value }
      } else if (key === "theme") {
        body.theme = value
      }

      const response = await fetch("/api/users/me/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()
      if (data.success) {
        setSettings(prev => {
          if (key === "isPrivate") return { ...prev, isPrivate: value }
          if (key.startsWith("notifications.")) {
            const notifKey = key.split(".")[1]
            return { ...prev, notifications: { ...prev.notifications, [notifKey]: value } }
          }
          if (key === "theme") return { ...prev, theme: value }
          return prev
        })
        if (key === "isPrivate") updateUser({ isPrivate: value })
        toast({ title: "Settings updated", description: "Your changes have been saved." })
      }
    } catch (error) {
      console.error("Error updating settings:", error)
      toast({ title: "Error", description: "Failed to update settings.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const saveProfile = async () => {
    setProfileSaving(true)
    try {
      const token = localStorage.getItem("token")
      const formData = new FormData()
      formData.append("fullName", profileForm.fullName)
      formData.append("bio", profileForm.bio)
      formData.append("favoriteGenres", JSON.stringify(profileForm.favoriteGenres))
      if (removeAvatar) {
        formData.append("removeAvatar", "true")
      } else if (avatarFile) {
        formData.append("avatar", avatarFile)
      }

      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        updateUser(data.data)
        setAvatarFile(null)
        setAvatarPreview(null)
        setRemoveAvatar(false)
        toast({ title: "Profile updated", description: "Your profile has been saved." })
      } else {
        toast({ title: "Error", description: data.message || "Failed to update profile.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" })
    } finally {
      setProfileSaving(false)
    }
  }

  const fetchFollowRequests = async () => {
    setRequestsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/users/me/follow-requests", {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) setFollowRequests(data.data.requests)
    } catch (error) {
      console.error("Error fetching follow requests:", error)
    } finally {
      setRequestsLoading(false)
    }
  }

  const handleAcceptRequest = async (requesterId) => {
    setProcessingIds(prev => new Set(prev).add(requesterId))
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/users/me/follow-requests", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId })
      })
      const data = await response.json()
      if (data.success) {
        setFollowRequests(prev => prev.filter(r => r._id !== requesterId))
        toast({ title: "Request accepted", description: "This user can now see your profile." })
      }
    } catch (error) {
      console.error("Error accepting request:", error)
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(requesterId); return n })
    }
  }

  const handleDeclineRequest = async (requesterId) => {
    setProcessingIds(prev => new Set(prev).add(requesterId))
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/users/me/follow-requests?requesterId=${requesterId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setFollowRequests(prev => prev.filter(r => r._id !== requesterId))
        toast({ title: "Request declined", description: "Follow request has been removed." })
      }
    } catch (error) {
      console.error("Error declining request:", error)
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(requesterId); return n })
    }
  }

  // ---------- Handlers ----------

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Avatar must be under 5 MB.", variant: "destructive" })
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setRemoveAvatar(false)
  }

  const handleRemoveAvatar = () => {
    setRemoveAvatar(true)
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const toggleGenre = (genre) => {
    setProfileForm(prev => {
      const genres = prev.favoriteGenres.includes(genre)
        ? prev.favoriteGenres.filter(g => g !== genre)
        : [...prev.favoriteGenres, genre]
      return { ...prev, favoriteGenres: genres }
    })
  }

  const handleLogout = () => logout()

  // ---------- Render helpers ----------

  const Toggle = ({ value, onChange, disabled }) => (
    <button
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
        value ? "bg-primary" : "bg-secondary"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        value ? "translate-x-6" : "translate-x-1"
      }`} />
    </button>
  )

  if (isLoading || settingsLoading || !user) {
    return (
      <main className="min-h-screen bg-background pt-20 pb-24">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </main>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Groups */}
      <div className="flex-1 overflow-y-auto">
        {SIDEBAR_SECTIONS.filter(s => s.group === "account").map(section => (
          <button
            key={section.id}
            onClick={() => { setActiveSection(section.id); setMobileSidebarOpen(false) }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeSection === section.id
                ? "bg-secondary/60 text-foreground border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            }`}
          >
            <section.icon className="w-5 h-5" />
            {section.label}
          </button>
        ))}

        {/* Privacy heading */}
        <p className="px-4 pt-6 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Who can see your content
        </p>
        {SIDEBAR_SECTIONS.filter(s => s.group === "privacy").map(section => {
          if (section.id === "follow-requests" && !settings.isPrivate) return null
          return (
            <button
              key={section.id}
              onClick={() => { setActiveSection(section.id); setMobileSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                activeSection === section.id
                  ? "bg-secondary/60 text-foreground border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              }`}
            >
              <section.icon className="w-5 h-5" />
              {section.label}
              {section.id === "follow-requests" && followRequests.length > 0 && (
                <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-bold">
                  {followRequests.length}
                </span>
              )}
            </button>
          )
        })}

        {/* Preferences heading */}
        <p className="px-4 pt-6 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Preferences
        </p>
        {SIDEBAR_SECTIONS.filter(s => s.group === "preferences").map(section => (
          <button
            key={section.id}
            onClick={() => { setActiveSection(section.id); setMobileSidebarOpen(false) }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeSection === section.id
                ? "bg-secondary/60 text-foreground border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            }`}
          >
            <section.icon className="w-5 h-5" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Logout at bottom */}
      <div className="border-t border-border p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-secondary/30 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-0">
        <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">

          {/* Mobile header: current section + hamburger */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Settings</h2>
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <ChevronRight className={`w-5 h-5 transition-transform ${mobileSidebarOpen ? "rotate-90" : ""}`} />
            </button>
          </div>

          {/* Mobile sidebar drawer */}
          {mobileSidebarOpen && (
            <div className="md:hidden border-b border-border bg-secondary/10">
              {sidebarContent}
            </div>
          )}

          {/* Desktop Sidebar */}
          <aside className="hidden md:flex md:flex-col w-72 border-r border-border flex-shrink-0 sticky top-16 h-[calc(100vh-64px)] overflow-hidden">
            {sidebarContent}
          </aside>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-6">

              {/* ─── EDIT PROFILE ─── */}
              {activeSection === "edit-profile" && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6">Edit Profile</h2>

                  {/* Avatar section */}
                  <div className="bg-secondary/20 rounded-2xl p-5 border border-border flex items-center gap-5 mb-6">
                    <div className="relative">
                      <Avatar className="w-20 h-20 border-2 border-primary">
                        {removeAvatar ? (
                          <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                            {user.username?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        ) : (
                          <>
                            <AvatarImage src={avatarPreview || user.avatar} alt={user.username} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                              {user.username?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{user.username}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.fullName || user.username}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change photo
                      </Button>
                      {(user.avatar && user.avatar !== 'https://via.placeholder.com/150') || avatarPreview || avatarFile ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleRemoveAvatar}
                          disabled={removeAvatar}
                        >
                          {removeAvatar ? "Will be removed" : "Remove photo"}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Full name */}
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-foreground mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                      maxLength={100}
                      placeholder="Your display name"
                      className="w-full px-4 py-2.5 bg-secondary/20 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>

                  {/* Bio */}
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-foreground mb-2">Bio</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      maxLength={500}
                      rows={3}
                      placeholder="Tell everyone a little about yourself"
                      className="w-full px-4 py-2.5 bg-secondary/20 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      {profileForm.bio.length} / 500
                    </p>
                  </div>

                  {/* Favorite Genres */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-foreground mb-2">Favorite Genres</label>
                    <p className="text-xs text-muted-foreground mb-3">Select genres you enjoy most</p>
                    <div className="flex flex-wrap gap-2">
                      {GENRE_OPTIONS.map(genre => (
                        <button
                          key={genre}
                          onClick={() => toggleGenre(genre)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                            profileForm.favoriteGenres.includes(genre)
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                          }`}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Save button */}
                  <Button
                    onClick={saveProfile}
                    disabled={profileSaving}
                    className="w-full gap-2"
                  >
                    {profileSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              )}

              {/* ─── NOTIFICATIONS ─── */}
              {activeSection === "notifications" && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6">Notifications</h2>
                  <div className="space-y-3">
                    {[
                      { key: "push", label: "Push Notifications", desc: "Get notified about new activity in real-time" },
                      { key: "email", label: "Email Notifications", desc: "Receive updates and activity summaries via email" },
                      { key: "watchPartyInvites", label: "Watch Party Invites", desc: "Get notified when you're invited to watch parties" },
                      { key: "newReviews", label: "New Reviews", desc: "Get notified when someone reviews content you've rated" }
                    ].map(item => (
                      <div key={item.key} className="bg-secondary/20 rounded-xl p-5 border border-border flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-medium text-foreground text-sm">{item.label}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                        <Toggle
                          value={settings.notifications?.[item.key] ?? true}
                          onChange={(v) => updateSettings(`notifications.${item.key}`, v)}
                          disabled={saving}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── ACCOUNT PRIVACY ─── */}
              {activeSection === "privacy" && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6">Account Privacy</h2>

                  {/* Toggle */}
                  <div className="bg-secondary/20 rounded-xl p-5 border border-border mb-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {settings.isPrivate ? <Lock className="w-5 h-5 text-primary" /> : <Globe className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Private Account</h3>
                          <p className="text-sm text-muted-foreground">
                            {settings.isPrivate
                              ? "Only your followers can see your reviews, watchlist, and favorites."
                              : "Your profile is public. Anyone can view your information."}
                          </p>
                        </div>
                      </div>
                      <Toggle
                        value={settings.isPrivate}
                        onChange={(v) => updateSettings("isPrivate", v)}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Info card */}
                  <div className="bg-secondary/10 rounded-xl p-5 border border-border/50">
                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      What others can see
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-sm text-muted-foreground">Username, avatar, and bio are always visible</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-sm text-muted-foreground">Follower and following counts are always visible</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${settings.isPrivate ? "bg-red-500" : "bg-green-500"}`} />
                        <span className="text-sm text-muted-foreground">
                          Reviews, watchlist, favorites, and achievements
                          {settings.isPrivate ? " — only visible to followers" : " — visible to everyone"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {settings.isPrivate && (
                    <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20 mt-5">
                      <p className="text-sm text-amber-400 flex items-start gap-2">
                        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        When someone sends you a follow request, you'll find it in the "Follow Requests" section.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── FOLLOW REQUESTS ─── */}
              {activeSection === "follow-requests" && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6">Follow Requests</h2>

                  {!settings.isPrivate ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Globe className="w-12 h-12 text-muted-foreground mb-4" />
                      <h3 className="font-semibold text-foreground mb-1">Your account is public</h3>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Switch to a private account in the Privacy section to require follow approvals.
                      </p>
                    </div>
                  ) : requestsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 bg-secondary/20 rounded-xl animate-pulse">
                          <div className="w-12 h-12 rounded-full bg-secondary/50" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-28 bg-secondary/50 rounded" />
                            <div className="h-3 w-20 bg-secondary/50 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : followRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                        <UserCheck className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">No pending requests</h3>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        When someone requests to follow you, they'll appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {followRequests.map(request => (
                        <div key={request._id} className="flex items-center gap-3 p-4 bg-secondary/20 rounded-xl border border-border">
                          <button onClick={() => router.push(`/profile/${request._id}`)} className="cursor-pointer">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={request.avatar} alt={request.username} />
                              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                {request.username?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => router.push(`/profile/${request._id}`)}
                              className="font-semibold text-foreground text-sm truncate block cursor-pointer hover:underline"
                            >
                              {request.username}
                            </button>
                            {request.fullName && (
                              <p className="text-xs text-muted-foreground truncate">{request.fullName}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(request.requestedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              className="text-xs px-4 h-8"
                              disabled={processingIds.has(request._id)}
                              onClick={() => handleAcceptRequest(request._id)}
                            >
                              {processingIds.has(request._id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm"}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs px-4 h-8"
                              disabled={processingIds.has(request._id)}
                              onClick={() => handleDeclineRequest(request._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── APPEARANCE ─── */}
              {activeSection === "appearance" && (
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-6">Appearance</h2>

                  <div className="space-y-3">
                    <button
                      onClick={() => updateSettings("theme", "dark")}
                      className={`w-full flex items-center gap-4 p-5 rounded-xl border transition-colors cursor-pointer ${
                        settings.theme === "dark"
                          ? "bg-primary/10 border-primary"
                          : "bg-secondary/20 border-border hover:border-primary/50"
                      }`}
                    >
                      <Moon className="w-5 h-5 text-primary" />
                      <div className="flex-1 text-left">
                        <h3 className="font-medium text-foreground text-sm">Dark Mode</h3>
                        <p className="text-xs text-muted-foreground">A darker theme that's easy on the eyes</p>
                      </div>
                      {settings.theme === "dark" && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        </div>
                      )}
                    </button>
                    <button
                      onClick={() => updateSettings("theme", "light")}
                      className={`w-full flex items-center gap-4 p-5 rounded-xl border transition-colors cursor-pointer ${
                        settings.theme === "light"
                          ? "bg-primary/10 border-primary"
                          : "bg-secondary/20 border-border hover:border-primary/50"
                      }`}
                    >
                      <Sun className="w-5 h-5 text-primary" />
                      <div className="flex-1 text-left">
                        <h3 className="font-medium text-foreground text-sm">Light Mode</h3>
                        <p className="text-xs text-muted-foreground">A brighter theme for well-lit environments</p>
                      </div>
                      {settings.theme === "light" && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
    </main>
  )
}
