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
  Trash2,
  ImagePlus,
  Menu,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DatePicker } from "@/components/ui/date-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  { id: "blocked-users", label: "Blocked Users", icon: Shield, group: "privacy" },
  { id: "follow-requests", label: "Follow Requests", icon: UserCheck, group: "privacy" },
]

// Skeleton Components
function SettingsSkeleton({ activeSection }) {
  return (
    <main className="bg-background h-[calc(100vh-64px)] overflow-hidden pb-16 md:pb-0">
      <div className="flex flex-row h-full">
        {/* Sidebar skeleton — desktop */}
        <aside className="hidden md:flex flex-col flex-shrink-0 w-64 border-r border-border h-full">
          <div className="flex-1 overflow-y-auto">
            {SIDEBAR_SECTIONS.map((section, idx) => (
              <div
                key={section.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  section.group === "privacy" && idx === 2 ? "mt-3 pt-6 border-t border-border" : ""
                }`}
              >
                <div className="w-5 h-5 bg-secondary/60 rounded animate-pulse" />
                <div className="h-4 w-24 bg-secondary/60 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-5 h-5 bg-secondary/60 rounded animate-pulse" />
              <div className="h-4 w-16 bg-secondary/60 rounded animate-pulse" />
            </div>
          </div>
        </aside>

        {/* Main Content skeleton */}
        <div className="flex-1 h-full overflow-y-auto">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="w-5 h-5 bg-secondary/60 rounded animate-pulse" />
            <div className="h-5 w-32 bg-secondary/60 rounded animate-pulse" />
            <div className="w-5" />
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block sticky top-0 z-30 bg-background border-b border-border px-6 py-4">
            <div className="h-6 w-40 bg-secondary/60 rounded animate-pulse" />
          </div>

          <div className="max-w-3xl mx-auto px-6 py-6">
            {activeSection === "edit-profile" && <EditProfileSkeleton />}
            {activeSection === "notifications" && <NotificationsSkeleton />}
            {activeSection === "privacy" && <PrivacySkeleton />}
            {activeSection === "blocked-users" && <BlockedUsersSkeleton />}
            {activeSection === "follow-requests" && <FollowRequestsSkeleton />}
          </div>
        </div>
      </div>
    </main>
  )
}

function EditProfileSkeleton() {
  return (
    <div>
      {/* Avatar section */}
      <div className="bg-secondary/20 rounded-2xl p-5 border border-border flex flex-col items-center gap-3 mb-6">
        <div className="w-24 h-24 rounded-full bg-secondary/60 animate-pulse" />
        <div className="text-center space-y-2">
          <div className="h-5 w-32 bg-secondary/60 rounded animate-pulse mx-auto" />
          <div className="h-4 w-24 bg-secondary/60 rounded animate-pulse mx-auto" />
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-5">
        {/* Name */}
        <div>
          <div className="h-4 w-20 bg-secondary/60 rounded animate-pulse mb-2" />
          <div className="h-11 w-full bg-secondary/20 border border-border rounded-xl animate-pulse" />
        </div>

        {/* Bio */}
        <div>
          <div className="h-4 w-12 bg-secondary/60 rounded animate-pulse mb-2" />
          <div className="h-24 w-full bg-secondary/20 border border-border rounded-xl animate-pulse" />
        </div>

        {/* Date of Birth */}
        <div>
          <div className="h-4 w-28 bg-secondary/60 rounded animate-pulse mb-2" />
          <div className="h-11 w-full bg-secondary/20 border border-border rounded-xl animate-pulse" />
        </div>

        {/* Genres */}
        <div>
          <div className="h-4 w-32 bg-secondary/60 rounded animate-pulse mb-3" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-8 w-20 bg-secondary/30 rounded-full animate-pulse" />
            ))}
          </div>
        </div>

        {/* Save button */}
        <div className="h-10 w-full bg-secondary/60 rounded-lg animate-pulse" />
      </div>
    </div>
  )
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-secondary/20 rounded-xl p-5 border border-border flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 bg-secondary/60 rounded animate-pulse" />
            <div className="h-3 w-full max-w-md bg-secondary/60 rounded animate-pulse" />
          </div>
          <div className="w-11 h-6 bg-secondary/60 rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function PrivacySkeleton() {
  return (
    <div>
      {/* Toggle section */}
      <div className="bg-secondary/20 rounded-xl p-5 border border-border mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-10 h-10 rounded-full bg-secondary/60 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-secondary/60 rounded animate-pulse" />
              <div className="h-4 w-full max-w-sm bg-secondary/60 rounded animate-pulse" />
            </div>
          </div>
          <div className="w-11 h-6 bg-secondary/60 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Info card */}
      <div className="bg-secondary/10 rounded-xl p-5 border border-border/50">
        <div className="h-5 w-40 bg-secondary/60 rounded animate-pulse mb-3" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary/60 animate-pulse" />
              <div className="h-4 w-64 bg-secondary/60 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BlockedUsersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/60 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-secondary/60 rounded animate-pulse" />
              <div className="h-3 w-20 bg-secondary/60 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-20 bg-secondary/60 rounded-md animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function FollowRequestsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-secondary/20 rounded-xl border border-border">
          <div className="w-12 h-12 rounded-full bg-secondary/60 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 bg-secondary/60 rounded animate-pulse" />
            <div className="h-3 w-20 bg-secondary/60 rounded animate-pulse" />
            <div className="h-3 w-24 bg-secondary/60 rounded animate-pulse" />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <div className="h-8 w-16 bg-secondary/60 rounded-md animate-pulse" />
            <div className="h-8 w-16 bg-secondary/60 rounded-md animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, isLoading, updateUser, logout } = useUser()
  const { toast } = useToast()
  const fileInputRef = useRef(null)

  const [activeSection, setActiveSection] = useState("edit-profile")
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const [settings, setSettings] = useState({
    isPrivate: false,
    notifications: {
      push: true,
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
    dateOfBirth: "",
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

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState([])
  const [blockedLoading, setBlockedLoading] = useState(false)

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
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "",
        favoriteGenres: user.preferences?.favoriteGenres || []
      })
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (settings.isPrivate && activeSection === "follow-requests") {
      fetchFollowRequests()
    }
    if (activeSection === "blocked-users") {
      fetchBlockedUsers()
    }
  }, [settings.isPrivate, activeSection])

  // ---------- API calls ----------

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/users/me/settings", {
        headers: {}
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
        method: "PATCH",
        headers: {
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
      const formData = new FormData()
      formData.append("fullName", profileForm.fullName)
      formData.append("bio", profileForm.bio)
      formData.append("dateOfBirth", profileForm.dateOfBirth)
      formData.append("favoriteGenres", JSON.stringify(profileForm.favoriteGenres))
      if (removeAvatar) {
        formData.append("removeAvatar", "true")
      } else if (avatarFile) {
        formData.append("avatar", avatarFile)
      }

      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {},
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

  const fetchBlockedUsers = async () => {
    setBlockedLoading(true)
    try {
      const response = await fetch("/api/users/blocked", {
        headers: {}
      })
      const data = await response.json()
      if (data.success) setBlockedUsers(data.users)
    } catch (error) {
      console.error("Error fetching blocked users:", error)
    } finally {
      setBlockedLoading(false)
    }
  }

  const handleUnblockUser = async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}/block`, {
        method: "POST",
        headers: {}
      })
      const data = await response.json()
      if (data.success) {
        setBlockedUsers(prev => prev.filter(u => u._id !== userId))
        toast({ title: "User unblocked successfully" })
      }
    } catch (error) {
      console.error("Error unblocking user:", error)
      toast({ title: "Failed to unblock user", variant: "destructive" })
    }
  }

  const fetchFollowRequests = async () => {
    setRequestsLoading(true)
    try {
      const response = await fetch("/api/users/me/follow-requests", {
        headers: {}
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
      const response = await fetch("/api/users/me/follow-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch(`/api/users/me/follow-requests?requesterId=${requesterId}`, {
        method: "DELETE",
        headers: {}
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
    return <SettingsSkeleton activeSection={activeSection} />
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-background relative">
      {/* Mobile close button top-right (only visible on mobile when sidebar is open) */}
      <button 
        onClick={() => setIsMobileSidebarOpen(false)} 
        className="md:hidden absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground cursor-pointer z-50"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Groups */}
      <div className="flex-1 overflow-y-auto mt-12 md:mt-0">
        {SIDEBAR_SECTIONS.filter(s => s.group === "account").map(section => (
          <button
            key={section.id}
            onClick={() => {
              setActiveSection(section.id)
              setIsMobileSidebarOpen(false)
            }}
            title={section.label}
            className={`w-full flex items-center justify-start gap-3 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeSection === section.id
                ? "bg-secondary/60 text-foreground border-l-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            }`}
          >
            <section.icon className="w-5 h-5 flex-shrink-0" />
            <span>{section.label}</span>
          </button>
        ))}

        {/* Privacy heading */}
        <div className="block md:hidden mx-2 my-3 border-t border-border" />
        {SIDEBAR_SECTIONS.filter(s => s.group === "privacy").map(section => {
          if (section.id === "follow-requests" && !settings.isPrivate) return null
          return (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id)
                setIsMobileSidebarOpen(false)
              }}
              title={section.label}
              className={`w-full flex items-center justify-start gap-3 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                activeSection === section.id
                  ? "bg-secondary/60 text-foreground border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
              }`}
            >
              <section.icon className="w-5 h-5 flex-shrink-0" />
              <span>{section.label}</span>
              {section.id === "follow-requests" && followRequests.length > 0 && (
                <span className="md:ml-auto px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-bold">
                  {followRequests.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Logout at bottom */}
      <div className="border-t border-border p-4">
        <button
          onClick={handleLogout}
          title="Log Out"
          className="w-full flex items-center justify-start gap-3 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-secondary/30 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <main className="bg-background h-[calc(100vh-64px)] overflow-hidden pb-16 md:pb-0 relative">
        <div className="flex flex-row h-full">

          {/* Sidebar — desktop */}
          <aside className="hidden md:flex flex-col flex-shrink-0 w-64 border-r border-border h-full overflow-y-auto overflow-x-hidden">
            {sidebarContent}
          </aside>

          {/* Sidebar Overlay — mobile */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* Sliding Sidebar — mobile */}
          <aside 
            className={`fixed inset-y-0 left-0 z-50 w-[50vw] bg-background border-r border-border transform transition-transform duration-300 ease-in-out md:hidden h-full ${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {sidebarContent}
          </aside>

          {/* Main Content */}
          <div className="flex-1 h-full overflow-y-auto">
            {/* Mobile Header / Menu Toggle */}
            <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-border bg-background sticky top-0 z-30">
               <button
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
               >
                  <Menu className="w-5 h-5 flex-shrink-0" />
               </button>
               <h2 className="text-base font-semibold text-foreground">
                 {SIDEBAR_SECTIONS.find(s => s.id === activeSection)?.label || "Settings"}
               </h2>
               <div className="w-5" />
            </div>

            {/* Desktop Section Header - sticky on desktop */}
            <div className="hidden md:block sticky top-0 z-30 bg-background border-b border-border px-6 py-4">
              <h2 className="text-xl font-bold text-foreground">
                {SIDEBAR_SECTIONS.find(s => s.id === activeSection)?.label || "Settings"}
              </h2>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-6">

              {/* ─── EDIT PROFILE ─── */}
              {activeSection === "edit-profile" && (
                <div>

                  {/* Avatar section */}
                  <div className="bg-secondary/20 rounded-2xl p-5 border border-border flex flex-col items-center gap-3 mb-6">
                    <div className="relative">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="relative cursor-pointer group/avatar rounded-full focus:outline-none">
                            <Avatar className="w-24 h-24 border-2 border-primary transition-opacity group-hover/avatar:opacity-80">
                              {removeAvatar ? (
                                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                                  {user.username?.charAt(0).toUpperCase() || "U"}
                                </AvatarFallback>
                              ) : (
                                <>
                                  <AvatarImage src={avatarPreview || user.avatar} alt={user.username} />
                                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                                    {user.username?.charAt(0).toUpperCase() || "U"}
                                  </AvatarFallback>
                                </>
                              )}
                            </Avatar>
                            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                              <Camera className="w-5 h-5 text-white" />
                            </div>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-48">
                          <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                            <ImagePlus className="w-4 h-4 mr-2" />
                            Change photo
                          </DropdownMenuItem>
                          {((user.avatar && user.avatar !== 'https://via.placeholder.com/150') || avatarPreview || avatarFile) && !removeAvatar && (
                            <DropdownMenuItem onClick={handleRemoveAvatar} className="cursor-pointer">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove photo
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{user.username}</p>
                      <p className="text-sm text-muted-foreground">{user.fullName || user.username}</p>
                      {removeAvatar && (
                        <p className="text-xs text-destructive mt-1">Photo will be removed on save</p>
                      )}
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

                  {/* Date of Birth */}
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Date of Birth
                    </label>
                    <DatePicker
                      value={profileForm.dateOfBirth}
                      onChange={(val) => setProfileForm(prev => ({ ...prev, dateOfBirth: val }))}
                      max={new Date().toISOString().split('T')[0]}
                      placeholder="Select your date of birth"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Used to personalize content visibility</p>
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
                  <div className="space-y-3">
                    <div className="bg-secondary/20 rounded-xl p-5 border border-border flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-foreground text-sm">Push Notifications</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Get notified about new activity in real-time. When disabled, you won't receive any notifications.
                        </p>
                      </div>
                      <Toggle
                        value={settings.notifications?.push ?? true}
                        onChange={(v) => updateSettings(`notifications.push`, v)}
                        disabled={saving}
                      />
                    </div>

                    {settings.notifications?.push && (
                      <div className="bg-secondary/20 rounded-xl p-5 border border-border flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-medium text-foreground text-sm">Friend Reviews</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Occasionally get notified when a friend reviews something you might like or have already reviewed
                          </p>
                        </div>
                        <Toggle
                          value={settings.notifications?.newReviews ?? true}
                          onChange={(v) => updateSettings(`notifications.newReviews`, v)}
                          disabled={saving}
                        />
                      </div>
                    )}
                  </div>

                  {!settings.notifications?.push && (
                    <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20 mt-5">
                      <p className="text-sm text-amber-400 flex items-start gap-2">
                        <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Push notifications are disabled. You won't receive any notifications until you enable them.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── ACCOUNT PRIVACY ─── */}
              {activeSection === "privacy" && (
                <div>

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
                {/* ─── BLOCKED USERS ─── */}
                {activeSection === "blocked-users" && (
                  <div>
                    {blockedLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    ) : blockedUsers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Shield className="w-12 h-12 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No blocked users</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">
                          When you block someone, they won't be able to find your profile or send you messages.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {blockedUsers.map(u => (
                          <div key={u._id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-xl border border-border">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10 border border-border">
                                <AvatarImage src={u.avatar} />
                                <AvatarFallback className="bg-secondary text-foreground">
                                  {u.username?.substring(0,2).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground text-sm">{u.fullName}</p>
                                <p className="text-muted-foreground text-xs">@{u.username}</p>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleUnblockUser(u._id)}
                            >
                              Unblock
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              {/* ─── FOLLOW REQUESTS ─── */}
              {activeSection === "follow-requests" && (
                <div>

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
                              {new Date(request.requestedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
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
            </div>
          </div>
        </div>
    </main>
  )
}
