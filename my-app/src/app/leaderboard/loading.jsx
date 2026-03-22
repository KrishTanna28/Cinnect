import { LeaderboardSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <main className="min-h-screen bg-background pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-4">
          <div className="animate-pulse">
            <div className="h-10 w-64 bg-secondary/50 rounded mb-2" />
            <div className="h-5 w-96 bg-secondary/50 rounded" />
          </div>
        </div>
        <LeaderboardSkeleton />
      </div>
    </main>
  )
}
