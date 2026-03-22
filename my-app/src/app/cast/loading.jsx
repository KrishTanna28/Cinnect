export default function Loading() {
  return (
    <main className="min-h-screen bg-background pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-4 text-center">
          <div className="animate-pulse mx-auto">
            <div className="h-16 w-16 bg-primary/20 rounded-full mx-auto mb-4" />
            <div className="h-8 w-64 bg-secondary/50 rounded mx-auto mb-2" />
            <div className="h-5 w-96 bg-secondary/50 rounded mx-auto" />
          </div>
        </div>

        {/* Chat interface skeleton */}
        <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden h-[600px] flex flex-col">
          {/* Messages area */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {/* AI message */}
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-secondary/50 rounded animate-pulse" />
                <div className="h-4 w-full bg-secondary/50 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-secondary/50 rounded animate-pulse" />
              </div>
            </div>

            {/* User message */}
            <div className="flex gap-3 items-start justify-end">
              <div className="flex-1 space-y-2 flex flex-col items-end">
                <div className="h-4 w-48 bg-primary/20 rounded animate-pulse" />
                <div className="h-4 w-64 bg-primary/20 rounded animate-pulse" />
              </div>
              <div className="w-8 h-8 rounded-full bg-secondary/50 flex-shrink-0 animate-pulse" />
            </div>

            {/* AI message */}
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-secondary/50 rounded animate-pulse" />
                <div className="h-4 w-full bg-secondary/50 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-secondary/50 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-secondary/50 rounded animate-pulse" />
              </div>
            </div>
          </div>

          {/* Input area */}
          <div className="border-t border-border p-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 h-10 bg-secondary/50 rounded-lg animate-pulse" />
              <div className="h-10 w-10 bg-primary/20 rounded-lg animate-pulse flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
