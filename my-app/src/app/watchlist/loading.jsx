import { WatchlistSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <main className="min-h-screen bg-background pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-4">
          <div className="animate-pulse">
            <div className="h-10 w-48 bg-secondary/50 rounded mb-2" />
            <div className="h-5 w-80 bg-secondary/50 rounded" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-10 w-24 bg-secondary/50 rounded-lg" />
          ))}
        </div>

        <WatchlistSkeleton />
      </div>
    </main>
  )
}
