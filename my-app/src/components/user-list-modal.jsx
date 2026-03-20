"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, Search, UserPlus, UserCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser } from "@/contexts/UserContext"
import Link from "next/link"

/* ── Skeleton for user row ────────────────────────────────── */
function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-secondary/50 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-28 bg-secondary/50 rounded" />
        <div className="h-3 w-20 bg-secondary/50 rounded" />
      </div>
      <div className="h-8 w-24 bg-secondary/50 rounded-md" />
    </div>
  )
}

/**
 * A reusable modal that displays a list of users.
 *
 * Props:
 *  - isOpen        : boolean
 *  - onClose       : () => void
 *  - title         : string  (header text, e.g. "Liked by friends")
 *  - users         : array of user objects [{ _id, username, fullName, avatar, isFollowedByMe }]
 *  - loading       : boolean
 *  - searchable    : boolean (default true – show search box)
 *  - onSearch      : (query: string) => void  (called on debounced search input)
 *  - onLoadMore    : () => void               (called when scrolled to bottom)
 *  - hasMore       : boolean
 *  - loadingMore   : boolean
 *  - emptyMessage  : string (shown when users array is empty)
 *  - showFollowBtn : boolean (default true)
 */
export default function UserListModal({
  isOpen,
  onClose,
  title = "Users",
  users = [],
  loading = false,
  searchable = true,
  onSearch,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  emptyMessage = "No users found",
  showFollowBtn = true,
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [optimisticFollowOverrides, setOptimisticFollowOverrides] = useState({})
  const listRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const { user: currentUser } = useUser()

  // Merge optimistic overrides with prop-based users
  const derivedUsers = users.map((u) =>
    optimisticFollowOverrides.hasOwnProperty(u._id)
      ? { ...u, isFollowedByMe: optimisticFollowOverrides[u._id] }
      : u
  )

  // Clear overrides when users prop changes (fresh data from parent)
  useEffect(() => {
    setOptimisticFollowOverrides({})
  }, [users])

  // Reset search when modal opens/closes
  useEffect(() => {
    if (!isOpen) setSearchQuery("")
  }, [isOpen])

  // Debounced search
  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      onSearch?.(value)
    }, 300)
  }

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!listRef.current || loadingMore || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      onLoadMore?.()
    }
  }, [loadingMore, hasMore, onLoadMore])

  // Follow / Unfollow — optimistic update
  const handleFollowToggle = async (targetId, isCurrentlyFollowing) => {
    const token = localStorage.getItem("token")
    if (!token || !currentUser) return

    // Optimistic: immediately toggle in UI
    // We need to update via a parent callback or local derived state.
    // Since users come from props, we'll track optimistic overrides locally.
    setOptimisticFollowOverrides((prev) => ({
      ...prev,
      [targetId]: !isCurrentlyFollowing
    }))

    try {
      const response = await fetch(`/api/users/${targetId}/follow`, {
        method: isCurrentlyFollowing ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      if (!data.success) {
        console.error("Follow toggle failed:", data.message)
        // Revert on failure
        setOptimisticFollowOverrides((prev) => {
          const next = { ...prev }
          delete next[targetId]
          return next
        })
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      // Revert on network error
      setOptimisticFollowOverrides((prev) => {
        const next = { ...prev }
        delete next[targetId]
        return next
      })
    }
  }

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-background border border-border rounded-2xl shadow-xl flex flex-col max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex gap-0 flex-1">
            <button
              className="flex-1 py-2 text-center font-semibold text-sm transition-colors cursor-pointer relative text-foreground"
            >
              {title}
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:text-primary transition-all active:scale-90 cursor-pointer ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        {searchable && (
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search"
                className="pl-9 bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-primary h-9"
              />
            </div>
          </div>
        )}

        {/* User List */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          {loading ? (
            <div className="divide-y divide-border/50">
              {[...Array(8)].map((_, i) => (
                <UserRowSkeleton key={i} />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">
                {searchQuery ? "No users found" : emptyMessage}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {derivedUsers.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center gap-3 p-3 hover:bg-secondary/20 transition-colors"
                >
                  <Link
                    href={`/profile/${u._id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar className="w-11 h-11 flex-shrink-0">
                      <AvatarImage src={u.avatar} alt={u.username} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                        {u.username?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {u.username}
                      </p>
                      {u.fullName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {u.fullName}
                        </p>
                      )}
                    </div>
                  </Link>

                  {/* Follow / Following button */}
                  {showFollowBtn && currentUser && currentUser._id !== u._id && (
                    <Button
                      variant={u.isFollowedByMe ? "secondary" : "default"}
                      size="sm"
                      className={`text-xs px-4 h-8 min-w-[90px] cursor-pointer transition-none ${
                        u.isFollowedByMe
                          ? "bg-secondary/50 hover:bg-secondary text-foreground"
                          : ""
                      }`}
                      onClick={() =>
                        handleFollowToggle(u._id, u.isFollowedByMe)
                      }
                    >
                      {u.isFollowedByMe ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}

              {/* Loading more indicator */}
              {loadingMore && (
                <div className="divide-y divide-border/50">
                  {[...Array(3)].map((_, i) => (
                    <UserRowSkeleton key={`loading-more-${i}`} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
