"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Crown, Loader2, Trophy, ChevronDown } from "lucide-react"
import { LeaderboardSkeleton } from "@/components/skeletons"
import { useUser } from "@/contexts/UserContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function TopThreeCard({ entry, rank, isCurrentUser }) {
  if (!entry) return null

  const getRankStyle = () => {
    if (rank === 1) return "border-primary bg-primary/10"
    if (rank === 2) return "border-gray-400 bg-gray-400/10"
    return "border-amber-700 bg-amber-700/10"
  }

  const getRankBadgeStyle = () => {
    if (rank === 1) return "bg-primary text-primary-foreground"
    if (rank === 2) return "bg-gray-400 text-gray-900"
    return "bg-amber-700 text-white"
  }

  const getAvatarSize = () => {
    if (rank === 1) return "h-20 w-20 sm:h-24 sm:w-24"
    return "h-14 w-14 sm:h-16 sm:w-16"
  }

  return (
    <Link
      href={isCurrentUser ? "/profile" : `/profile/${entry._id}`}
      className={`block rounded-xl border-2 ${getRankStyle()} p-4 sm:p-5 transition-all hover:scale-[1.02] ${
        isCurrentUser ? "ring-2 ring-primary/50" : ""
      } ${rank === 1 ? "order-2 sm:order-2" : rank === 2 ? "order-1 sm:order-1" : "order-3 sm:order-3"}`}
    >
      <div className="flex flex-col items-center text-center">
        {rank === 1 && (
          <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2" />
        )}

        <div className="relative mb-3">
          <Avatar className={`${getAvatarSize()} border-2 ${rank === 1 ? "border-primary" : rank === 2 ? "border-gray-400" : "border-amber-700"}`}>
            <AvatarImage src={entry.avatar} alt={entry.username} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg sm:text-xl">
              {(entry.fullName || entry.username || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 ${getRankBadgeStyle()} rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold`}>
            {rank}
          </div>
        </div>

        <p className="font-semibold text-foreground text-sm sm:text-base text-center break-words leading-tight">
          {entry.fullName || entry.username}
        </p>
        <p className="text-xs text-muted-foreground mb-2 break-all">@{entry.username}</p>

        <div className="flex items-center gap-1 text-primary font-bold text-lg sm:text-xl">
          <Trophy className="h-4 w-4" />
          <span>{Math.round(entry.ranking?.score || 0)}</span>
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</p>
      </div>
    </Link>
  )
}

function LeaderboardRow({ entry, isCurrentUser }) {
  return (
    <Link
      id={isCurrentUser ? "current-user-rank" : undefined}
      href={isCurrentUser ? "/profile" : `/profile/${entry._id}`}
      className={`group flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-secondary/20 transition-all hover:border-primary/50 hover:bg-secondary/40 ${
        isCurrentUser ? "ring-1 ring-primary/50 bg-primary/5" : ""
      }`}
    >
      {/* Rank */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        entry.ranking.globalRank <= 10
          ? "border-2 border-primary/50 bg-primary/10 text-primary"
          : entry.ranking.globalRank <= 50
            ? "border-2 border-violet-500/40 bg-violet-500/10 text-violet-400"
            : "border border-border bg-secondary/50 text-muted-foreground"
      }`}>
        {entry.ranking.globalRank}
      </div>

      {/* Avatar */}
      <Avatar className="h-10 w-10 border border-border">
        <AvatarImage src={entry.avatar} alt={entry.username} />
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
          {(entry.fullName || entry.username || "U").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors break-words leading-tight">
            {entry.fullName || entry.username}
          </p>
        </div>
        <p className="text-xs text-muted-foreground break-all">@{entry.username}</p>
      </div>

      {/* Score */}
      <div className="text-right">
        <p className="font-bold text-foreground">{Math.round(entry.ranking?.score || 0)}</p>
        <p className="text-[10px] text-muted-foreground uppercase">Score</p>
      </div>
    </Link>
  )
}

export default function LeaderboardPage() {
  const { user } = useUser()
  const [leaderboard, setLeaderboard] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchLeaderboard(1, true)
  }, [])

  const fetchLeaderboard = async (nextPage = 1, replace = false) => {
    try {
      if (replace) setIsLoading(true)
      else setIsLoadingMore(true)
      setError(null)

      const res = await fetch(`/api/leaderboard?page=${nextPage}&limit=20`)
      const data = await res.json()

      if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch leaderboard")

      const users = data.data?.users || []
      const pagination = data.data?.pagination

      setLeaderboard(prev => (replace ? users : [...prev, ...users]))
      setPage(pagination?.page || nextPage)
      setHasMore((pagination?.page || nextPage) < (pagination?.pages || 1))
    } catch (err) {
      console.error("Leaderboard fetch error:", err)
      setError(err.message || "Failed to load leaderboard")
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  const currentUserId = user?._id?.toString()
  const currentUserEntry = useMemo(
    () => leaderboard.find(entry => entry._id?.toString() === currentUserId),
    [leaderboard, currentUserId]
  )

  const topThree = leaderboard.slice(0, 3)
  const remainingEntries = leaderboard.slice(3)

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-8 sm:py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              Leaderboard
            </h1>
            <p className="text-muted-foreground text-sm italic font-medium tracking-wide">
              "Power resides where men believe it resides."
            </p>
          </div>

          {currentUserEntry && (
            <div className="mt-6 flex justify-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="text-foreground">
                  Your rank: <span className="font-bold text-primary">#{currentUserEntry.ranking.globalRank}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : error ? (
          <div className="rounded-xl border border-border bg-secondary/20 py-16 text-center">
            <Trophy className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg text-destructive">{error}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="rounded-xl border border-border bg-secondary/20 py-16 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No rankings yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top 3 Podium */}
            {topThree.length > 0 && (
              <section>
                {/* Mobile: #1 on top, #2 and #3 below */}
                <div className="sm:hidden space-y-3">
                  <TopThreeCard
                    entry={topThree[0]}
                    rank={1}
                    isCurrentUser={topThree[0]?._id?.toString() === currentUserId}
                  />
                  <div className="grid grid-cols-2 gap-3 items-start">
                    <TopThreeCard
                      entry={topThree[1]}
                      rank={2}
                      isCurrentUser={topThree[1]?._id?.toString() === currentUserId}
                    />
                    <TopThreeCard
                      entry={topThree[2]}
                      rank={3}
                      isCurrentUser={topThree[2]?._id?.toString() === currentUserId}
                    />
                  </div>
                </div>

                {/* Tablet/Desktop: podium layout */}
                <div className="hidden sm:grid grid-cols-3 gap-4 items-end">
                  <div className="pt-6">
                    <TopThreeCard
                      entry={topThree[1]}
                      rank={2}
                      isCurrentUser={topThree[1]?._id?.toString() === currentUserId}
                    />
                  </div>
                  <div>
                    <TopThreeCard
                      entry={topThree[0]}
                      rank={1}
                      isCurrentUser={topThree[0]?._id?.toString() === currentUserId}
                    />
                  </div>
                  <div className="pt-6">
                    <TopThreeCard
                      entry={topThree[2]}
                      rank={3}
                      isCurrentUser={topThree[2]?._id?.toString() === currentUserId}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Rest of leaderboard */}
            {remainingEntries.length > 0 && (
              <section className="space-y-2">
                {remainingEntries.map((entry) => (
                  <LeaderboardRow
                    key={entry._id}
                    entry={entry}
                    isCurrentUser={entry._id?.toString() === currentUserId}
                  />
                ))}
              </section>
            )}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center">
                <button
                  onClick={() => fetchLeaderboard(page + 1)}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/30 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:border-primary/50 hover:bg-secondary/50 disabled:opacity-60"
                >
                  {isLoadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}

            {/* End message */}
            {!hasMore && leaderboard.length > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                You've reached the end of the leaderboard
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
