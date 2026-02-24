"use client"

/**
 * Reusable skeleton loader components for every page type.
 *
 * Usage:
 *   import { MovieDetailSkeleton } from "@/components/skeletons"
 *   if (loading) return <MovieDetailSkeleton />
 */

/* ── Primitive ───────────────────────────────────────────── */

function Bone({ className = "" }) {
  return <div className={`animate-pulse bg-secondary/50 rounded ${className}`} />
}

/* ── Full-page wrapper ───────────────────────────────────── */

function PageShell({ children, className = "" }) {
  return (
    <main className={`min-h-screen bg-background ${className}`}>
      {children}
    </main>
  )
}

/* ── Home / Global Suspense ──────────────────────────────── */

export function HomeSkeleton() {
  return (
    <PageShell>
      {/* Hero */}
      <div className="relative h-[70vh] sm:h-screen animate-pulse bg-secondary/30 -mt-16">
        <div className="absolute bottom-16 sm:bottom-32 left-4 sm:left-14 lg:left-20 max-w-2xl space-y-4">
          <Bone className="h-6 w-20 rounded-full" />
          <Bone className="h-12 w-80 sm:w-[28rem]" />
          <Bone className="h-4 w-64" />
          <Bone className="h-4 w-48" />
          <div className="flex gap-2 pt-4">
            <Bone className="h-8 w-16 rounded-full" />
            <Bone className="h-8 w-16 rounded-full" />
          </div>
        </div>
      </div>
      {/* Carousel rows */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {[...Array(4)].map((_, i) => (
          <CarouselRowSkeleton key={i} />
        ))}
      </div>
    </PageShell>
  )
}

/* ── Movie / TV Detail ───────────────────────────────────── */

export function MovieDetailSkeleton() {
  return (
    <PageShell>
      {/* Hero backdrop */}
      <div className="relative h-[400px] sm:h-[500px] lg:h-[600px] animate-pulse bg-secondary/30" />
      {/* Info overlay */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-40 relative z-10">
        <div className="grid grid-cols-3 gap-8">
          <Bone className="col-span-1 aspect-[2/3] rounded-lg" />
          <div className="col-span-2 space-y-4 pt-4">
            <Bone className="h-10 w-3/4" />
            <div className="flex gap-2">
              <Bone className="h-6 w-16 rounded-full" />
              <Bone className="h-6 w-20 rounded-full" />
              <Bone className="h-6 w-24 rounded-full" />
            </div>
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-5/6" />
            <Bone className="h-4 w-2/3" />
            <div className="flex gap-3 pt-4">
              <Bone className="h-10 w-28 rounded-lg" />
              <Bone className="h-10 w-28 rounded-lg" />
              <Bone className="h-10 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
      {/* Sections below */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        <CarouselRowSkeleton />
        <CarouselRowSkeleton />
      </div>
    </PageShell>
  )
}

/* ── Actor Detail ────────────────────────────────────────── */

export function ActorDetailSkeleton() {
  return (
    <PageShell className="pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Bone className="aspect-[2/3] rounded-lg" />
          <div className="md:col-span-2 space-y-4">
            <Bone className="h-10 w-64" />
            <Bone className="h-5 w-40" />
            <div className="flex gap-4">
              <Bone className="h-4 w-28" />
              <Bone className="h-4 w-28" />
            </div>
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-5/6" />
            <Bone className="h-4 w-3/4" />
          </div>
        </div>
        <div className="mt-12 space-y-10">
          <CarouselRowSkeleton />
          <CarouselRowSkeleton />
        </div>
      </div>
    </PageShell>
  )
}

/* ── Season Detail ───────────────────────────────────────── */

export function SeasonDetailSkeleton() {
  return (
    <PageShell className="pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Bone className="h-7 w-7 rounded-full mb-6" />
        {/* Poster + info */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <Bone className="aspect-[2/3] rounded-lg" />
          <div className="md:col-span-3 space-y-4">
            <Bone className="h-8 w-64" />
            <div className="flex gap-3">
              <Bone className="h-5 w-16 rounded-full" />
              <Bone className="h-5 w-24 rounded-full" />
            </div>
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-5/6" />
          </div>
        </div>
        {/* Episode list */}
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <Bone className="w-40 h-24 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Bone className="h-5 w-48" />
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}

/* ── Profile (own) ───────────────────────────────────────── */

export function ProfileSkeleton() {
  return (
    <PageShell>
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary/40 to-transparent border-b border-border py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <Bone className="w-24 h-24 rounded-full flex-shrink-0" />
          <div className="space-y-3 flex-1">
            <Bone className="h-8 w-48" />
            <Bone className="h-4 w-32" />
            <Bone className="h-4 w-64" />
          </div>
        </div>
      </div>
      {/* Stats grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Bone key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        {/* Tabs placeholder */}
        <div className="flex gap-4 mt-8 mb-6">
          {[...Array(4)].map((_, i) => (
            <Bone key={i} className="h-10 w-24 rounded-lg" />
          ))}
        </div>
        {/* Content area */}
        <CardGridSkeleton count={6} />
      </div>
    </PageShell>
  )
}

/* ── Public Profile ──────────────────────────────────────── */

export function PublicProfileSkeleton() {
  return (
    <PageShell className="pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Profile card */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="h-32 bg-secondary/30 animate-pulse" />
          <div className="px-6 pb-6 -mt-12 space-y-4">
            <Bone className="w-28 h-28 rounded-full border-4 border-background" />
            <Bone className="h-7 w-48" />
            <Bone className="h-4 w-32" />
            <Bone className="h-4 w-64" />
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <Bone key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    </PageShell>
  )
}

/* ── Watchlist ────────────────────────────────────────────── */

export function WatchlistSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse bg-secondary/20 rounded-lg p-6 border border-border flex items-center gap-6">
          <Bone className="w-24 h-32 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Bone className="h-6 w-48" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Leaderboard ─────────────────────────────────────────── */

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-secondary/20">
          <Bone className="w-8 h-8 rounded-full flex-shrink-0" />
          <Bone className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Bone className="h-5 w-36" />
            <Bone className="h-3 w-24" />
          </div>
          <Bone className="h-6 w-16" />
          <Bone className="h-6 w-12" />
        </div>
      ))}
    </div>
  )
}

/* ── Achievements ────────────────────────────────────────── */

export function AchievementsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg p-6 border border-border space-y-3">
          <Bone className="w-12 h-12 rounded-full mx-auto" />
          <Bone className="h-5 w-32 mx-auto" />
          <Bone className="h-3 w-48 mx-auto" />
          <Bone className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}

/* ── Reviews Page ────────────────────────────────────────── */

export function ReviewsPageSkeleton() {
  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Bone className="h-7 w-7 rounded-full" />
        <Bone className="h-8 w-48" />
        <ReviewListSkeleton count={4} />
      </div>
    </PageShell>
  )
}

/* ── Search Results ──────────────────────────────────────── */

export function SearchResultsSkeleton() {
  return (
    <div className="min-h-[50vh] py-8">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(18)].map((_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

/* ── Community Detail ────────────────────────────────────── */

export function CommunityDetailSkeleton() {
  return (
    <PageShell>
      {/* Banner */}
      <div className="h-48 sm:h-64 animate-pulse bg-secondary/30" />
      {/* Community header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="flex items-end gap-4 mb-6">
          <Bone className="w-20 h-20 rounded-full flex-shrink-0 border-4 border-background" />
          <div className="space-y-2 flex-1">
            <Bone className="h-7 w-48" />
            <div className="flex gap-2">
              <Bone className="h-5 w-16 rounded-full" />
              <Bone className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
        {/* Posts feed */}
        <PostListSkeleton count={4} />
      </div>
    </PageShell>
  )
}

/* ── Community Post Detail ───────────────────────────────── */

export function PostDetailSkeleton() {
  return (
    <PageShell className="pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Bone className="h-7 w-7 rounded-full" />
        {/* Post card */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Bone className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <Bone className="h-4 w-32" />
              <Bone className="h-3 w-20" />
            </div>
          </div>
          <Bone className="h-7 w-3/4" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-2/3" />
          <div className="flex gap-4 pt-2">
            <Bone className="h-8 w-16" />
            <Bone className="h-8 w-16" />
            <Bone className="h-8 w-16" />
          </div>
        </div>
        {/* Comments */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <Bone className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-28" />
                <Bone className="h-4 w-full" />
                <Bone className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}

/* ── Post Form (New / Edit) ──────────────────────────────── */

export function PostFormSkeleton() {
  return (
    <PageShell className="pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Bone className="h-9 w-48" />
        <Bone className="h-10 w-full rounded-lg" />
        <Bone className="h-40 w-full rounded-lg" />
        <Bone className="h-24 w-full rounded-lg" />
        <Bone className="h-10 w-32 rounded-lg" />
      </div>
    </PageShell>
  )
}

/* ── Communities Feed ─────────────────────────────────────── */

export function CommunitiesFeedSkeleton() {
  return <PostListSkeleton count={5} />
}

/* ── Recommendations ─────────────────────────────────────── */

export function RecommendationsSkeleton() {
  return (
    <div className="space-y-10">
      {[...Array(5)].map((_, i) => (
        <CarouselRowSkeleton key={i} />
      ))}
    </div>
  )
}

/* ── Auth Callback / Protected Route (simple pulse) ──────── */

export function AuthSkeleton() {
  return (
    <PageShell className="flex items-center justify-center">
      <div className="text-center space-y-4">
        <Bone className="w-16 h-16 rounded-full mx-auto" />
        <Bone className="h-4 w-40 mx-auto" />
      </div>
    </PageShell>
  )
}

/* ─── Section-level skeletons (for inline use) ───────────── */

/* Single movie card skeleton matching MovieCard overlay UI */
function MovieCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-secondary/50">
        {/* Overlay info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-secondary/80 to-transparent p-2 sm:p-3 space-y-1.5">
          <Bone className="h-3 w-12 rounded-sm" />
          <Bone className="h-3.5 w-full rounded-sm" />
          <Bone className="h-3 w-3/4 rounded-sm" />
          <div className="flex gap-1.5">
            <Bone className="h-4 w-10 rounded-sm" />
            <Bone className="h-4 w-10 rounded-sm" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* Horizontal poster carousel row */
export function CarouselRowSkeleton() {
  return (
    <div className="space-y-4">
      <Bone className="h-7 w-48" />
      <div className="flex gap-3 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-36 animate-pulse">
            <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-secondary/50">
              {/* Faint gradient hint at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1.5">
                <Bone className="h-2.5 w-10 rounded-sm bg-secondary/40" />
                <Bone className="h-3 w-full rounded-sm bg-secondary/40" />
                <div className="flex gap-1.5">
                  <Bone className="h-3 w-8 rounded-sm bg-secondary/40" />
                  <Bone className="h-3 w-8 rounded-sm bg-secondary/40" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* Card grid (posters / profile tabs) */
export function CardGridSkeleton({ count = 10, cols = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" }) {
  return (
    <div className={`grid ${cols} gap-4`}>
      {[...Array(count)].map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  )
}

/* Post list */
export function PostListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse bg-card rounded-lg border border-border p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Bone className="w-8 h-8 rounded-full" />
            <Bone className="h-4 w-28" />
            <Bone className="h-3 w-16 ml-auto" />
          </div>
          <Bone className="h-5 w-3/4" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-2/3" />
          <div className="flex gap-4 pt-1">
            <Bone className="h-5 w-12" />
            <Bone className="h-5 w-12" />
            <Bone className="h-5 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* Review list */
export function ReviewListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse bg-card rounded-lg border border-border p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Bone className="w-10 h-10 rounded-full" />
            <div className="space-y-1">
              <Bone className="h-4 w-24" />
              <Bone className="h-3 w-16" />
            </div>
            <div className="ml-auto flex gap-1">
              {[...Array(5)].map((_, j) => (
                <Bone key={j} className="w-4 h-4 rounded-sm" />
              ))}
            </div>
          </div>
          <Bone className="h-5 w-48" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  )
}

/* Video thumbnail row */
export function VideoRowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden py-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-80 animate-pulse">
          <Bone className="aspect-video w-full rounded-lg mb-2" />
          <Bone className="h-4 w-3/4 mb-1" />
          <Bone className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

/* News card row */
export function NewsRowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden py-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-80 animate-pulse">
          <Bone className="h-48 w-full rounded-t-lg" />
          <div className="p-4 space-y-2 bg-card rounded-b-lg border border-t-0 border-border">
            <Bone className="h-5 w-3/4" />
            <Bone className="h-4 w-full" />
            <Bone className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* Inline small spinner placeholder (for load-more triggers) */
export function InlineLoadingSkeleton({ count = 3 }) {
  return (
    <div className="flex gap-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-36 animate-pulse">
          <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-secondary/50">
            <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1.5">
              <Bone className="h-2.5 w-10 rounded-sm bg-secondary/40" />
              <Bone className="h-3 w-full rounded-sm bg-secondary/40" />
              <div className="flex gap-1.5">
                <Bone className="h-3 w-8 rounded-sm bg-secondary/40" />
                <Bone className="h-3 w-8 rounded-sm bg-secondary/40" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
