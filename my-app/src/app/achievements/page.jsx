"use client"

import { useState, useEffect } from "react"
import { Star, Lock, Loader2 } from "lucide-react"
import { AchievementsSkeleton } from "@/components/skeletons"

// Achievement definitions — these are static definitions of what achievements exist,
// but the unlocked state and progress come from real user data from the API.
const ACHIEVEMENT_DEFINITIONS = [
  {
    id: "cinephile",
    name: "Cinephile",
    description: "Write 50 reviews",
    icon: "🎬",
    field: "reviewsWritten",
    threshold: 50,
  },
  {
    id: "critic",
    name: "Critic",
    description: "Write 10 reviews",
    icon: "✍️",
    field: "reviewsWritten",
    threshold: 10,
  },
  {
    id: "social_butterfly",
    name: "Social Butterfly",
    description: "Follow 5 other users",
    icon: "🦋",
    field: "followingCount",
    threshold: 5,
  },
  {
    id: "community_leader",
    name: "Community Leader",
    description: "Get 100 likes on your reviews",
    icon: "👑",
    field: "totalLikes",
    threshold: 100,
  },
  {
    id: "marathon_runner",
    name: "Marathon Runner",
    description: "Add 20 titles to your watchlist",
    icon: "🏃",
    field: "watchlistCount",
    threshold: 20,
  },
  {
    id: "legendary",
    name: "Legendary",
    description: "Reach 5000 points",
    icon: "⭐",
    field: "points",
    threshold: 5000,
  },
]

export default function AchievementsPage() {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Please log in to view your achievements.")
        setIsLoading(false)
        return
      }

      const res = await fetch("/api/users/me/stats", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch stats")
      }

      setStats(data.data)
    } catch (err) {
      console.error("Stats fetch error:", err)
      setError(err.message || "Failed to load achievements")
    } finally {
      setIsLoading(false)
    }
  }

  const getAchievements = () => {
    if (!stats) return []

    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      let progress = 0

      if (def.field === "points") {
        progress = stats.points?.total || 0
      } else if (stats.achievements) {
        progress = stats.achievements[def.field] || 0
      }

      const unlocked = progress >= def.threshold

      return {
        ...def,
        progress,
        maxProgress: def.threshold,
        unlocked,
      }
    })
  }

  const achievements = getAchievements()
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-transparent border-b border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Achievements</h1>
          </div>
          <p className="text-muted-foreground text-lg">Unlock badges and earn rewards</p>
        </div>
      </div>

      {isLoading ? (
        <AchievementsSkeleton />
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-destructive text-lg">{error}</p>
        </div>
      ) : (
        <>
          {/* Achievements Grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`rounded-lg p-6 border transition-all ${
                    achievement.unlocked
                      ? "bg-primary/10 border-primary/50 hover:border-primary"
                      : "bg-secondary/20 border-border hover:border-border/80"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 relative inline-block">
                      {achievement.icon}
                      {!achievement.unlocked && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-foreground mb-1">{achievement.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{achievement.description}</p>

                    <div>
                      <div className="w-full bg-secondary rounded-full h-2 mb-1">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              (achievement.progress / achievement.maxProgress) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.min(achievement.progress, achievement.maxProgress)}/
                        {achievement.maxProgress}
                      </p>
                    </div>

                    {achievement.unlocked && (
                      <div className="mt-3 inline-block px-2 py-1 bg-primary/20 text-primary text-xs font-semibold rounded">
                        Unlocked
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">Your Stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <p className="text-muted-foreground text-sm mb-2">Achievements Unlocked</p>
                <p className="text-3xl font-bold text-primary">
                  {unlockedCount}/{achievements.length}
                </p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <p className="text-muted-foreground text-sm mb-2">Total Points</p>
                <p className="text-3xl font-bold text-primary">
                  {(stats?.points?.total || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <p className="text-muted-foreground text-sm mb-2">Current Level</p>
                <p className="text-3xl font-bold text-primary">{stats?.level || 1}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-6 border border-border">
                <p className="text-muted-foreground text-sm mb-2">Reviews Written</p>
                <p className="text-3xl font-bold text-primary">
                  {stats?.achievements?.reviewsWritten || 0}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
