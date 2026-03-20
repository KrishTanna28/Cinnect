"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Crown, Loader2, Shield, Star, Trophy } from "lucide-react"
import { LeaderboardSkeleton } from "@/components/skeletons"
import { useUser } from "@/contexts/UserContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function getTierBadgeClasses(tier = "") {
  const value = tier.toLowerCase()

  if (value.includes("throne") || value.includes("king / queen")) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300"
  }

  if (value.includes("hand") || value.includes("council")) {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300"
  }

  if (value.includes("kingsguard") || value.includes("warden") || value.includes("lord")) {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300"
  }

  return "border-border bg-background/60 text-muted-foreground"
}

function PodiumCard({ entry, place, isCurrentUser }) {
  if (!entry) return null

  const isFirst = place === 1

  return (
    <Link
      href={isCurrentUser ? "/profile" : `/profile/${entry._id}`}
      className={`block rounded-2xl border px-5 py-6 text-center transition-all duration-200 hover:-translate-y-1 hover:bg-secondary/30 ${
        isFirst
          ? "border-primary bg-secondary/30 shadow-[0_0_0_1px_rgba(212,175,55,0.12)]"
          : "border-border bg-secondary/20"
      } ${isCurrentUser ? "ring-1 ring-primary/30" : ""}`}
    >
      <div className="mb-4 flex items-center justify-center">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full border text-sm font-bold ${
            isFirst
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-foreground"
          }`}
        >
          #{place}
        </div>
      </div>

      {isFirst && (
        <div className="mb-3 flex justify-center">
          <Crown className="h-5 w-5 text-primary" />
        </div>
      )}

      <Avatar className={`mx-auto mb-4 border ${isFirst ? "h-20 w-20 border-primary" : "h-16 w-16 border-border"}`}>
        <AvatarImage src={entry.avatar} alt={entry.username} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {(entry.fullName || entry.username || "U").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <p className="font-semibold text-foreground">{entry.fullName || entry.username}</p>
          {isCurrentUser && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              You
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">@{entry.username}</p>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getTierBadgeClasses(entry.ranking.tier)}`}>
          {entry.ranking.tier}
        </span>
        <div className="grid grid-cols-2 gap-3 pt-2 text-left">
          <div className="rounded-xl border border-border bg-background/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Influence</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{entry.ranking.score}</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Quality</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{entry.ranking.qualityScore}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}

function LeaderboardRow({ entry, isCurrentUser }) {
  return (
    <Link
      id={isCurrentUser ? "current-user-rank" : undefined}
      href={isCurrentUser ? "/profile" : `/profile/${entry._id}`}
      className={`block rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/30 ${
        isCurrentUser
          ? "border-primary bg-primary/10"
          : "border-border bg-secondary/20"
      }`}
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-sm font-bold text-foreground">
            #{entry.ranking.globalRank}
          </div>
          <Avatar className="h-12 w-12 border border-border">
            <AvatarImage src={entry.avatar} alt={entry.username} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {(entry.fullName || entry.username || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-foreground">{entry.fullName || entry.username}</p>
              {isCurrentUser && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  You
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">@{entry.username}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getTierBadgeClasses(entry.ranking.tier)}`}>
            {entry.ranking.tier}
          </span>
          <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Influence</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{entry.ranking.score}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Quality</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{entry.ranking.qualityScore}</p>
          </div>
        </div>
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
      if (replace) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      setError(null)

      const res = await fetch(`/api/leaderboard?page=${nextPage}&limit=20`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch leaderboard")
      }

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

  const podium = leaderboard.slice(0, 3)
  const remainingEntries = leaderboard.slice(3)

  const goToMyRank = () => {
    if (currentUserEntry?.ranking?.globalRank && currentUserEntry.ranking.globalRank <= 3) {
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    const element = document.getElementById("current-user-rank")
    element?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-border bg-secondary/20 p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Crown className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">The Realm Rankings</h1>
            </div>
            <p className="text-sm text-muted-foreground sm:text-base">Climb the ranks. Claim the Throne.</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {currentUserEntry && (
                <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-foreground">
                    You are <span className="font-semibold text-primary">#{currentUserEntry.ranking.globalRank}</span> globally
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {isLoading ? (
          <LeaderboardSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-border bg-secondary/20 py-16 text-center">
            <p className="text-lg text-destructive">{error}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-border bg-secondary/20 py-16 text-center">
            <p className="text-lg text-muted-foreground">No users on the leaderboard yet. Be the first.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Top of the Realm</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3 md:items-end">
                <div className="md:order-1">
                  <PodiumCard
                    entry={podium[1]}
                    place={2}
                    isCurrentUser={podium[1]?._id?.toString() === currentUserId}
                  />
                </div>
                <div className="md:order-2">
                  <PodiumCard
                    entry={podium[0]}
                    place={1}
                    isCurrentUser={podium[0]?._id?.toString() === currentUserId}
                  />
                </div>
                <div className="md:order-3">
                  <PodiumCard
                    entry={podium[2]}
                    place={3}
                    isCurrentUser={podium[2]?._id?.toString() === currentUserId}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Leaderboard</p>
                  <p className="text-xs text-muted-foreground">Every position reflects quality, influence, and consistency.</p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <span>Rank</span>
                  <span>User</span>
                  <span>Tier</span>
                  <span>Signals</span>
                </div>
              </div>

              <div className="space-y-3">
                {remainingEntries.map(entry => (
                  <LeaderboardRow
                    key={entry._id}
                    entry={entry}
                    isCurrentUser={entry._id?.toString() === currentUserId}
                  />
                ))}
              </div>
            </section>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => fetchLeaderboard(page + 1)}
                  disabled={isLoadingMore}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-60"
                >
                  {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4 text-primary" />}
                  {isLoadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}

            {!hasMore && leaderboard.length > 0 && (
              <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3 text-center text-sm text-muted-foreground">
                End of the current rankings
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
