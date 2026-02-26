"use client"

import { useState, useEffect, useCallback } from "react"
import { Heart } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser } from "@/contexts/UserContext"
import UserListModal from "./user-list-modal"

/**
 * Shows an Instagram-style "Liked by <friend> and X others" row.
 *
 * Props:
 *  - contentId  : string (the TMDB movie / TV show ID)
 *  - mediaType  : "movie" | "tv" (default "movie")
 */
export default function FriendsLikedBy({ contentId, mediaType = "movie" }) {
  const { user } = useUser()
  const [friends, setFriends] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // For the modal's paginated & searchable list
  const [modalUsers, setModalUsers] = useState([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalPage, setModalPage] = useState(1)
  const [modalHasMore, setModalHasMore] = useState(false)
  const [modalLoadingMore, setModalLoadingMore] = useState(false)
  const [modalSearch, setModalSearch] = useState("")

  // ── Fetch initial preview (first 3 friends) ───────────────
  useEffect(() => {
    if (!user || !contentId) {
      setLoading(false)
      return
    }

    const fetchPreview = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(
          `/api/content/${mediaType}/${contentId}/friends-liked?limit=3`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = await res.json()
        if (data.success) {
          setFriends(data.data.users)
          setTotal(data.data.total)
        }
      } catch (err) {
        console.error("Error fetching friends who liked:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchPreview()
  }, [user, contentId, mediaType])

  // ── Fetch full list for the modal ──────────────────────────
  const fetchModalUsers = useCallback(
    async (page = 1, search = "") => {
      if (page === 1) setModalLoading(true)
      else setModalLoadingMore(true)

      try {
        const token = localStorage.getItem("token")
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          ...(search && { search }),
        })

        const res = await fetch(
          `/api/content/${mediaType}/${contentId}/friends-liked?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = await res.json()
        if (data.success) {
          if (page === 1) {
            setModalUsers(data.data.users)
          } else {
            setModalUsers((prev) => [...prev, ...data.data.users])
          }
          setModalHasMore(data.data.hasMore)
          setModalPage(page)
        }
      } catch (err) {
        console.error("Error fetching modal users:", err)
      } finally {
        setModalLoading(false)
        setModalLoadingMore(false)
      }
    },
    [contentId, mediaType]
  )

  const openModal = () => {
    setModalOpen(true)
    setModalSearch("")
    setModalPage(1)
    fetchModalUsers(1, "")
  }

  const handleModalSearch = (query) => {
    setModalSearch(query)
    setModalPage(1)
    fetchModalUsers(1, query)
  }

  const handleModalLoadMore = () => {
    fetchModalUsers(modalPage + 1, modalSearch)
  }

  // ── Don't render anything while loading or if there are no friends ──
  if (loading || !user || total === 0) return null

  const firstFriend = friends[0]
  const othersCount = total - 1

  return (
    <>
      {/* "Liked by ..." row */}
      <button
        onClick={openModal}
        className="flex items-center gap-2 cursor-pointer group w-fit"
      >
        {/* Stacked avatars */}
        <div className="flex -space-x-2">
          {friends.slice(0, 3).map((f) => (
            <Avatar
              key={f._id}
              className="w-6 h-6 border-2 border-background"
            >
              <AvatarImage src={f.avatar} alt={f.username} />
              <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                {f.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>

        {/* Text */}
        <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          <Heart className="w-3.5 h-3.5 inline fill-red-500 text-red-500 mr-1 -mt-0.5" />
          Liked by{" "}
          <span className="font-semibold text-foreground">
            {firstFriend.username}
          </span>
          {othersCount > 0 && (
            <>
              {" "}and{" "}
              <span className="font-semibold text-foreground">
                {othersCount} other{othersCount > 1 ? "s" : ""}
              </span>
            </>
          )}
        </p>
      </button>

      {/* Modal */}
      <UserListModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Friends who liked this"
        users={modalUsers}
        loading={modalLoading}
        onSearch={handleModalSearch}
        onLoadMore={handleModalLoadMore}
        hasMore={modalHasMore}
        loadingMore={modalLoadingMore}
        emptyMessage="None of your friends have liked this yet"
        showFollowBtn={false}
      />
    </>
  )
}
