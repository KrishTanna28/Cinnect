export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      {/* Filter area skeleton */}
      <div className="bg-background border-border border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Mobile filters button + search */}
          <div className="flex items-center gap-2 mb-4 lg:mb-0">
            <div className="lg:hidden animate-pulse h-10 w-24 bg-secondary/50 rounded-lg" />
            <div className="lg:hidden flex-1 animate-pulse h-10 bg-secondary/50 rounded-lg" />
          </div>

          {/* Desktop filters */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-2 mb-4">
              <div className="animate-pulse h-5 w-5 bg-secondary/50 rounded" />
              <div className="animate-pulse h-6 w-16 bg-secondary/50 rounded" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="animate-pulse h-4 w-16 bg-secondary/50 rounded" />
                  <div className="animate-pulse h-10 w-full bg-secondary/50 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results grid */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mt-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
          {[...Array(21)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-secondary/50">
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-secondary/80 to-transparent p-2 sm:p-3 space-y-1.5">
                  <div className="bg-secondary/50 rounded h-3 w-12" />
                  <div className="bg-secondary/50 rounded h-3.5 w-full" />
                  <div className="bg-secondary/50 rounded h-3 w-3/4" />
                  <div className="flex gap-1.5">
                    <div className="bg-secondary/50 rounded h-4 w-10" />
                    <div className="bg-secondary/50 rounded h-4 w-10" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
