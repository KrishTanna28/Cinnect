export default function Loading() {
  return (
    <main className="min-h-screen bg-background pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="animate-pulse h-10 w-48 bg-secondary/50 rounded mb-2" />
          <div className="animate-pulse h-5 w-96 bg-secondary/50 rounded" />
        </div>

        {/* Settings sections */}
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="animate-pulse h-6 w-40 bg-secondary/50 rounded mb-4" />
              {[...Array(3)].map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="animate-pulse h-4 w-32 bg-secondary/50 rounded" />
                  <div className="animate-pulse h-10 w-full bg-secondary/50 rounded-lg" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
