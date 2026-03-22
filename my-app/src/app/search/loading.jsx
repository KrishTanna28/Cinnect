import { SearchResultsSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <main className="min-h-screen bg-background pb-16 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Header */}
        <div className="mb-6">
          <div className="animate-pulse h-9 w-80 bg-secondary/50 rounded mb-4" />

          {/* Tabs skeleton */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse h-10 w-32 bg-secondary/50 rounded-lg flex-shrink-0" />
            ))}
          </div>
        </div>

        {/* Results skeleton */}
        <SearchResultsSkeleton />
      </div>
    </main>
  )
}
