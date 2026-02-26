"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, Check, X, UserPlus, UserMinus, UserCheck as UserCheckIcon, Users, Sparkles, Loader2, Heart, MessageCircle } from "lucide-react"
import { useUser } from "@/contexts/UserContext"
import Link from "next/link"

export default function NotificationBell() {
  const { user } = useUser()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // notificationId currently being acted on
  const dropdownRef = useRef(null)
  const hasFetchedAi = useRef(false)

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

  // Generate AI notifications (once per session / on first open)
  const generateAiNotifications = useCallback(async () => {
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

  // On mount: fetch + trigger AI gen once
  useEffect(() => {
    if (!user) return
    fetchNotifications()
    if (!hasFetchedAi.current) {
      hasFetchedAi.current = true
      generateAiNotifications().then(() => fetchNotifications())
    }
  }, [user, fetchNotifications, generateAiNotifications])

  // Poll every 60s
  useEffect(() => {
    if (!user) return
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [user, fetchNotifications])

  // Toggle dropdown
  const toggleDropdown = () => {
    const next = !open
    setOpen(next)
    if (next) {
      fetchNotifications()
    }
  }

  // Mark all as read
  const markAllRead = async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ markAllRead: true })
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch {
      // ignore
    }
  }

  // Handle accept / reject actions
  const handleAction = async (notificationId, action) => {
    const token = localStorage.getItem("token")
    if (!token) return
    setActionLoading(notificationId)
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
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId
              ? { ...n, actionTaken: true, actionType: action === "accept" ? "accepted" : "rejected", read: true }
              : n
          )
        )
        setUnreadCount(json.data?.unreadCount ?? Math.max(0, unreadCount - 1))
      }
    } catch (err) {
      console.error("Notification action failed:", err)
    } finally {
      setActionLoading(null)
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
        return <Sparkles className="w-4 h-4 text-amber-400" />
      case "new_follower":
        return <UserCheckIcon className="w-4 h-4 text-green-400" />
      case "lost_follower":
        return <UserMinus className="w-4 h-4 text-red-400" />
      case "review_like":
        return <Heart className="w-4 h-4 text-pink-400" />
      case "review_reply":
        return <MessageCircle className="w-4 h-4 text-blue-400" />
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />
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
        className="relative p-2 text-foreground hover:text-primary transition-colors cursor-pointer"
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
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            )}
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
                const hasLink = !!notif.link
                const RowTag = hasLink ? Link : "div"
                const rowProps = hasLink
                  ? { href: notif.link, onClick: () => setOpen(false) }
                  : {}
                return (
                  <RowTag
                    key={notif._id}
                    {...rowProps}
                    className={`flex gap-3 px-4 py-3 border-b border-border/50 transition-colors ${
                      hasLink ? "cursor-pointer hover:bg-secondary/40" : ""
                    } ${notif.read ? "bg-transparent" : "bg-primary/5"}`}
                  >
                  {/* Icon / avatar */}
                  <div className="flex-shrink-0 mt-0.5">
                    {notif.image ? (
                      <img src={notif.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                        {getIcon(notif.type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.createdAt)}</p>

                    {/* Action buttons for requests */}
                    {(notif.type === "follow_request" || notif.type === "community_join_request") && !notif.actionTaken && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(notif._id, "accept") }}
                          disabled={actionLoading === notif._id}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading === notif._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Accept
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(notif._id, "reject") }}
                          disabled={actionLoading === notif._id}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-secondary text-foreground rounded-full hover:bg-secondary/80 transition-colors cursor-pointer disabled:opacity-50"
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
