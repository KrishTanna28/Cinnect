"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X, Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser } from "@/contexts/UserContext"
import Link from "next/link"

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

export default function CommunityMembersModal({
  isOpen,
  onClose,
  slug,
  initialTab = "members"
}) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const listRef = useRef(null)
  const searchTimeoutRef = useRef(null)
  const { user: currentUser } = useUser()

  useEffect(() => {
    setUsers([])
    setPage(1)
    setHasMore(false)
    setSearchQuery("")
    if (isOpen) {
      fetchUsers(1, "")
    }
  }, [activeTab, isOpen, slug])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const fetchUsers = useCallback(async (pageNum, search) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const token = localStorage.getItem("token")
      const headers = {}
      if (token) headers["Authorization"] = `Bearer ${token}`

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "20",
        ...(search && { search }),
        ...(activeTab === "mutuals" && { mutualsOnly: "true" })
      })

      const response = await fetch(
        `/api/communities/${slug}/members?${params}`,
        { headers }
      )
      const data = await response.json()

      if (data.success) {
        if (pageNum === 1) {
          setUsers(data.data.users)
        } else {
          setUsers((prev) => [...prev, ...data.data.users])
        }
        setHasMore(data.data.hasMore)
        setPage(pageNum)
      }
    } catch (error) {
      console.error(`Error fetching ${activeTab}:`, error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [activeTab, slug])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setUsers([])
      setPage(1)
      fetchUsers(1, value)
    }, 300)
  }

  const handleScroll = useCallback(() => {
    if (!listRef.current || loadingMore || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      fetchUsers(page + 1, searchQuery)
    }
  }, [loadingMore, hasMore, page, searchQuery, fetchUsers])

  const handleFollowToggle = async (targetId, isCurrentlyFollowing) => {
    const token = localStorage.getItem("token")
    if (!token || !currentUser) return

    setUsers((prev) =>
      prev.map((u) =>
        u._id === targetId
          ? { ...u, isFollowedByMe: !isCurrentlyFollowing }
          : u
      )
    )

    try {
      const response = await fetch(`/api/users/${targetId}/follow`, {
        method: isCurrentlyFollowing ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })

      const data = await response.json()
      if (!data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === targetId
              ? { ...u, isFollowedByMe: isCurrentlyFollowing }
              : u
          )
        )
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      setUsers((prev) =>
        prev.map((u) =>
          u._id === targetId
            ? { ...u, isFollowedByMe: isCurrentlyFollowing }
            : u
        )
      )
    }
  }

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md mx-4 bg-background border border-border rounded-2xl shadow-xl flex flex-col max-h-[70vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex gap-0 flex-1">
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 py-2 text-center font-semibold text-sm transition-colors cursor-pointer relative ${
                activeTab === "members"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Members
              {activeTab === "members" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
            {currentUser && (
              <button
                onClick={() => setActiveTab("mutuals")}
                className={`flex-1 py-2 text-center font-semibold text-sm transition-colors cursor-pointer relative ${
                  activeTab === "mutuals"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                Friends
                {activeTab === "mutuals" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:text-primary transition-all active:scale-90 cursor-pointer ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
                {searchQuery
                  ? "No users found"
                  : activeTab === "members"
                  ? "No members yet"
                  : "No friends here"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {users.map((u) => (
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

                  {currentUser && currentUser._id !== u._id && (
                    <Button
                      variant={u.isFollowedByMe ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleFollowToggle(u._id, u.isFollowedByMe)}
                      className={`h-8 px-4 rounded-full text-xs font-semibold cursor-pointer ${
                        u.isFollowedByMe
                          ? "bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                          : ""
                      }`}
                    >
                      {u.isFollowedByMe ? "Following" : "Follow"}
                    </Button>
                  )}
                </div>
              ))}
              {loadingMore && (
                <div className="p-4 flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
