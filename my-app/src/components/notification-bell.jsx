"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, Check, X, UserPlus, UserMinus, UserCheck as UserCheckIcon, Users, Star, Loader2, Heart, MessageCircle, Gift, Film, Tv, Megaphone, Clapperboard, Newspaper, ExternalLink, Play } from "lucide-react"
import { useUser } from "@/contexts/UserContext"
import { useSocket } from "@/contexts/SocketContext"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useRouter } from "next/navigation"

// Entertainment notification types that can link externally
const ENTERTAINMENT_TYPES = new Set(["trailer", "news", "announcement", "casting_update", "interview"])

// Request types that should only be marked as read when action is taken
const REQUEST_TYPES = new Set(["follow_request", "community_join_request"])

export default function NotificationBell() {
  const { user } = useUser()
  const router = useRouter()
  const { on } = useSocket() || {}
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)
  const hasFetchedEntertainment = useRef(false)
  const shownToastIds = useRef(new Set())

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch("/api/notifications?limit=30", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setNotifications(json.data.notifications)
          setUnreadCount(json.data.unreadCount)
        }
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Generate entertainment notifications (once per session)
  const generateEntertainmentNotifications = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      await fetch("/api/notifications/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch {
      // non-critical
    }
  }, [])

  // On mount: fetch + trigger entertainment generation once
  useEffect(() => {
    if (!user) return
    fetchNotifications()
    if (!hasFetchedEntertainment.current) {
      hasFetchedEntertainment.current = true
      generateEntertainmentNotifications().then(() => fetchNotifications())
    }
  }, [user, fetchNotifications, generateEntertainmentNotifications])

  // ─── Real-time: listen for new notifications via Socket.IO ───
  useEffect(() => {
    if (!on) return
    const unsub = on("notification:new", (notif) => {
      setNotifications(prev => [notif, ...prev])
      setUnreadCount(prev => prev + 1)

      // Deduplicate toasts - only show if we haven't shown this notification ID recently
      const notifId = notif._id || notif.id
      if (notifId && shownToastIds.current.has(notifId)) {
        return
      }
      if (notifId) {
        shownToastIds.current.add(notifId)
        // Clear from set after 30 seconds to prevent memory buildup
        setTimeout(() => shownToastIds.current.delete(notifId), 30000)
      }

      toast({
        title: notif.title || "New Notification",
        description: notif.message || "",
      })
    })
    return unsub
  }, [on, toast])

  // ─── Mark non-request notifications as read when dropdown is opened ───
  const markNonRequestNotificationsRead = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    // Get IDs of unread non-request notifications
    const nonRequestUnreadIds = notifications
      .filter(n => !n.read && !REQUEST_TYPES.has(n.type))
      .map(n => n._id)

    if (nonRequestUnreadIds.length === 0) return

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notificationIds: nonRequestUnreadIds })
      })
      if (res.ok) {
        const json = await res.json()
        // Update local state - mark only non-request notifications as read
        setNotifications(prev => prev.map(n =>
          nonRequestUnreadIds.includes(n._id) ? { ...n, read: true } : n
        ))
        if (json.data?.unreadCount !== undefined) {
          setUnreadCount(json.data.unreadCount)
        }
      }
    } catch {
      // ignore
    }
  }, [notifications])

  // Toggle dropdown
  const toggleDropdown = () => {
    const next = !open
    setOpen(next)
    if (next) {
      fetchNotifications().then(() => {
        // After fetching, mark non-request notifications as seen
        setTimeout(() => markNonRequestNotificationsRead(), 100)
      })
    }
  }

  // Handle clicking a generic notification (mark Read + redirect via referenceId)
  const handleNotificationClick = async (notif, e) => {
    if (e && e.preventDefault) e.preventDefault()

    // Don't mark request notifications as read on click - only on accept/reject action
    const isRequest = REQUEST_TYPES.has(notif.type)

    // 1. Mark as read (only for non-request notifications)
    if (!notif.read && !isRequest) {
      const token = localStorage.getItem("token")
      if (token) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))

        fetch("/api/notifications", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ notificationIds: [notif._id] })
        }).catch((err) => console.error("Failed to mark notification as read:", err))
      }
    }

    setOpen(false)

    // 2. Redirect
    const isEntertainment = ENTERTAINMENT_TYPES.has(notif.type)
    const isExternal = isEntertainment && notif.externalLink
    let targetLink = isEntertainment && notif.externalLink ? notif.externalLink : notif.link

    // Fix backend link typos if returning /post/ instead of /posts/
    if (targetLink && targetLink.includes('/post/')) {
       targetLink = targetLink.replace('/post/', '/posts/')
    }

    // Fallback referencing
    if (!targetLink && notif.referenceId) {
      if (['post_like', 'post_comment', 'comment_reply', 'reply_to_reply', 'mention'].includes(notif.type)) {
         const slug = notif.community?.slug || 'unknown'
         targetLink = `/communities/${slug}/posts/${notif.referenceId}`
         if (notif.parentId) {
            targetLink += `#${notif.parentId}`
         }
      }
    }

    if (targetLink) {
      if (isExternal) {
        window.open(targetLink, "_blank", "noopener,noreferrer")
      } else {
        router.push(targetLink)
      }
    }
  }

  // Handle accept / reject actions — optimistic update
  const handleAction = async (notificationId, action) => {
    const token = localStorage.getItem("token")
    if (!token) return

    const prevNotifications = notifications
    const prevUnreadCount = unreadCount

    setNotifications(prev =>
      prev.map(n =>
        n._id === notificationId
          ? { ...n, actionTaken: true, actionType: action === "accept" ? "accepted" : "rejected", read: true }
          : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      const res = await fetch("/api/notifications/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notificationId, action })
      })
      if (res.ok) {
        const json = await res.json()
        if (json.data?.unreadCount !== undefined) {
          setUnreadCount(json.data.unreadCount)
        }
      } else {
        setNotifications(prevNotifications)
        setUnreadCount(prevUnreadCount)
      }
    } catch (err) {
      console.error("Notification action failed:", err)
      setNotifications(prevNotifications)
      setUnreadCount(prevUnreadCount)
    }
  }

  // Icon for each notification type
  const getIcon = (type) => {
    switch (type) {
      case "follow_request":
        return <UserPlus className="w-4 h-4 text-blue-400" />
      case "community_join_request":
        return <Users className="w-4 h-4 text-purple-400" />
      case "ai_generated":
        return <Star className="w-4 h-4 text-amber-400" />
      case "new_follower":
        return <UserCheckIcon className="w-4 h-4 text-green-400" />
      case "lost_follower":
        return <UserMinus className="w-4 h-4 text-red-400" />
      case "review_like":
        return <Heart className="w-4 h-4 text-pink-400" />
      case "review_reply":
        return <MessageCircle className="w-4 h-4 text-blue-400" />
      case "trailer":
        return <Play className="w-4 h-4 text-red-400" />
      case "news":
        return <Newspaper className="w-4 h-4 text-sky-400" />
      case "announcement":
        return <Megaphone className="w-4 h-4 text-amber-400" />
      case "casting_update":
        return <Clapperboard className="w-4 h-4 text-violet-400" />
      case "interview":
        return <Film className="w-4 h-4 text-teal-400" />
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />
    }
  }

  // Label for entertainment notification type
  const getTypeLabel = (type) => {
    switch (type) {
      case "trailer": return "Trailer"
      case "news": return "News"
      case "announcement": return "Announcement"
      case "casting_update": return "Casting"
      case "interview": return "Interview"
      default: return null
    }
  }

  // Time ago helper
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={toggleDropdown}
        className={`relative p-2 transition-all active:scale-90 cursor-pointer ${open ? 'text-primary' : 'text-foreground hover:text-primary'}`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute bottom-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-auto sm:left-auto sm:right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          </div>

          {/* Body */}
          <div className="overflow-y-auto max-h-[calc(70vh-52px)]">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Bell className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isEntertainment = ENTERTAINMENT_TYPES.has(notif.type)
                const targetLink = isEntertainment && notif.externalLink ? notif.externalLink : notif.link
                const isExternal = isEntertainment && notif.externalLink
                const hasLink = !!targetLink

                // We handle both redirect and mark-as-read via handleNotificationClick
                const RowTag = "div"
                const rowProps = {
                  onClick: (e) => handleNotificationClick(notif, e),
                  role: "button",
                  tabIndex: 0
                }

                return (
                  <RowTag
                    key={notif._id}
                    {...rowProps}
                    className={`flex text-left gap-3 px-4 py-3 border-b border-border/50 transition-colors cursor-pointer hover:bg-secondary/40 ${notif.read ? "bg-transparent" : "bg-primary/5"}`}
                  >
                  {/* Thumbnail / Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {isEntertainment && notif.image ? (
                      <div className="relative w-14 h-9 rounded overflow-hidden bg-secondary">
                        <img src={notif.image} alt="" className="w-full h-full object-cover" />
                        {notif.type === "trailer" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-3.5 h-3.5 text-white" fill="white" />
                          </div>
                        )}
                      </div>
                    ) : notif.image ? (
                      <img src={notif.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                        {getIcon(notif.type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p 
                        className="text-xs font-semibold text-foreground truncate" 
                        dangerouslySetInnerHTML={{ __html: notif.title }} 
                      />
                      {isExternal && <ExternalLink className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />}
                    </div>
                    <p 
                      className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2" 
                      dangerouslySetInnerHTML={{ __html: notif.message }} 
                    />

                    {/* Metadata row for entertainment notifications */}
                    {isEntertainment && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {getTypeLabel(notif.type) && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {getTypeLabel(notif.type)}
                          </span>
                        )}
                        {notif.source && (
                          <span className="text-[10px] text-muted-foreground/70 truncate max-w-[120px]">
                            {notif.source}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.createdAt)}</p>

                    {/* Action buttons for requests */}
                    {(notif.type === "follow_request" || notif.type === "community_join_request") && !notif.actionTaken && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(notif._id, "accept") }}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          Accept
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(notif._id, "reject") }}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-secondary text-foreground rounded-full hover:bg-secondary/80 transition-all active:scale-95 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                          Decline
                        </button>
                      </div>
                    )}

                    {/* Show action taken badge */}
                    {notif.actionTaken && (
                      <span className={`inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        notif.actionType === "accepted"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {notif.actionType === "accepted" ? "Accepted" : "Declined"}
                      </span>
                    )}

                  </div>

                  {/* Unread dot */}
                  {!notif.read && (
                    <div className="flex-shrink-0 mt-1.5">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                  )}
                  </RowTag>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
