"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Film, Tv, User, Star, Users } from "lucide-react"
import { searchMulti } from "@/lib/movies"
import useInfiniteScroll from "@/hooks/useInfiniteScroll"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SearchResultsSkeleton, InlineLoadingSkeleton } from "@/components/skeletons"
import { useUser } from "@/contexts/UserContext"
import { shouldFilterAdultContent } from "@/lib/utils/ageUtils"

const searchTabs = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'movies', label: 'Movies & TV', icon: Film },
  { id: 'celebrities', label: 'Celebrities', icon: Star },
  { id: 'people', label: 'Users', icon: Users },
]

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useUser()
  const query = searchParams.get("q") || ""
  const initialTab = searchParams.get("tab") || "all"

  const filterAdult = useMemo(() => shouldFilterAdultContent(user), [user])

  const [activeTab, setActiveTab] = useState(initialTab)
  const [results, setResults] = useState([])
  const [users, setUsers] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalResults, setTotalResults] = useState(0)

  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // Use refs to prevent unnecessary re-renders
  const searchAbortControllerRef = useRef(null)
  const usersAbortControllerRef = useRef(null)

  // Memoize categorized results to prevent recalculation on every render
  const moviesAndTV = useMemo(() => results.filter(item => item.mediaType !== 'person'), [results])
  const celebrities = useMemo(() => results.filter(item => item.mediaType === 'person'), [results])

  const performSearch = useCallback(async (searchTerm, page = 1, append = false) => {
    if (!searchTerm.trim()) return

    // Cancel previous search
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort()
    }
    searchAbortControllerRef.current = new AbortController()

    append ? setIsLoadingMore(true) : setIsInitialLoading(true)

    try {
      const data = await searchMulti(searchTerm, page)

      let newResults = data.data?.results || []

      // Filter adult content for underage users
      if (filterAdult) {
        newResults = newResults.filter(item => !item.adult)
      }

      setResults(prev => {
        const combined = append ? [...prev, ...newResults] : newResults

        const uniqueMap = new Map()
        combined.forEach(item => {
          uniqueMap.set(`${item.mediaType}-${item.id}`, item)
        })

        return Array.from(uniqueMap.values())
      })

      setCurrentPage(data.data?.page || 1)
      setTotalPages(data.data?.totalPages || 0)
      setTotalResults(data.data?.totalResults || 0)
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error("Search failed:", err)
        if (!append) setResults([])
      }
    } finally {
      append ? setIsLoadingMore(false) : setIsInitialLoading(false)
    }
  }, [filterAdult])

  const searchUsers = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) return

    // Cancel previous search
    if (usersAbortControllerRef.current) {
      usersAbortControllerRef.current.abort()
    }
    usersAbortControllerRef.current = new AbortController()

    setIsLoadingUsers(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}&limit=50`, {
        headers,
        signal: usersAbortControllerRef.current.signal
      })
      const data = await response.json()
      if (data.success) {
        setUsers(data.users || [])
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error searching users:', error)
      }
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  const loadMore = useCallback(() => {
    if (currentPage < totalPages && !isLoadingMore) {
      performSearch(query, currentPage + 1, true)
    }
  }, [currentPage, totalPages, isLoadingMore, query, performSearch])

  const loadMoreRef = useInfiniteScroll(
    loadMore,
    currentPage < totalPages,
    isLoadingMore,
    200
  )

  useEffect(() => {
    if (query) {
      performSearch(query, 1, false)
      searchUsers(query)
    } else {
      router.push("/")
    }

    // Cleanup function
    return () => {
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort()
      }
      if (usersAbortControllerRef.current) {
        usersAbortControllerRef.current.abort()
      }
    }
  }, [query, router, performSearch, searchUsers])

  useEffect(() => {
    // Update URL when tab changes
    const params = new URLSearchParams(searchParams)
    if (activeTab !== 'all') {
      params.set('tab', activeTab)
    } else {
      params.delete('tab')
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', newUrl)
  }, [activeTab, searchParams])

  const showUsers = activeTab === 'all' || activeTab === 'people'

  return (
    <main className="min-h-screen bg-background pb-16 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">
            Search Results for "<span className="text-primary">{query}</span>"
          </h1>

          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {searchTabs.map((tab) => {
              const Icon = tab.icon
              let count = 0
              if (tab.id === 'all') count = results.length + users.length
              else if (tab.id === 'movies') count = moviesAndTV.length
              else if (tab.id === 'celebrities') count = celebrities.length
              else if (tab.id === 'people') count = users.length

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap active:scale-95 cursor-pointer ${activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${activeTab === tab.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Initial Loading */}
        {isInitialLoading && results.length === 0 && (
          <SearchResultsSkeleton />
        )}

        {/* Results */}
        {!isInitialLoading && (
          <div className="space-y-12">
            {/* Movies & TV Section */}
            {(activeTab === 'all' || activeTab === 'movies') && moviesAndTV.length > 0 && (
              <section>
                {activeTab === 'all' && (
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Film className="w-5 h-5 text-primary" />
                      </div>
                      Movies & TV Shows
                      <span className="text-base text-muted-foreground font-normal">({moviesAndTV.length})</span>
                    </h2>
                    {moviesAndTV.length > 7 && (
                      <button
                        onClick={() => setActiveTab('movies')}
                        className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer font-medium"
                      >
                        View all →
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
                  {(activeTab === 'all' ? moviesAndTV.slice(0, 7) : moviesAndTV).map(item => (
                    <Link
                      key={`${item.mediaType}-${item.id}`}
                      href={item.mediaType === "tv" ? `/tv/${item.id}` : `/movies/${item.id}`}
                      className="group cursor-pointer"
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary mb-2 ring-2 ring-transparent group-hover:ring-primary transition-all">
                        {item.poster ? (
                          <img
                            src={item.poster}
                            alt={item.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            {item.mediaType === "tv" ? (
                              <Tv className="w-12 h-12 text-muted-foreground" />
                            ) : (
                              <Film className="w-12 h-12 text-muted-foreground" />
                            )}
                          </div>
                        )}

                        <div className="absolute top-2 left-2 text-xs px-2 py-1 bg-black/80 backdrop-blur-sm text-white rounded font-medium">
                          {item.mediaType === "tv" ? "TV" : "Movie"}
                        </div>

                        {item.rating > 0 && (
                          <div className="absolute top-2 right-2 inline-flex items-center gap-1 text-xs px-2 py-1 bg-black/80 backdrop-blur-sm text-primary rounded font-medium">
                            {item.rating.toFixed(1)}
                          </div>
                        )}
                      </div>

                      <h3 className="text-xs sm:text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {item.releaseDate?.split("-")[0] || "N/A"}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Celebrities Section */}
            {(activeTab === 'all' || activeTab === 'celebrities') && celebrities.length > 0 && (
              <section>
                {activeTab === 'all' && (
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Star className="w-5 h-5 text-amber-500" />
                      </div>
                      Celebrities
                      <span className="text-base text-muted-foreground font-normal">({celebrities.length})</span>
                    </h2>
                    {celebrities.length > 6 && (
                      <button
                        onClick={() => setActiveTab('celebrities')}
                        className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer font-medium"
                      >
                        View all →
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {(activeTab === 'all' ? celebrities.slice(0, 6) : celebrities).map(person => (
                    <Link
                      key={`celebrity-${person.id}`}
                      href={`/actor/${person.id}`}
                      className="group cursor-pointer"
                    >
                      <div className="relative aspect-square rounded-full overflow-hidden bg-gradient-to-br from-amber-500/20 to-orange-600/20 mb-3 mx-auto w-full max-w-[140px] ring-2 ring-transparent group-hover:ring-amber-500 transition-all">
                        {person.poster ? (
                          <img
                            src={person.poster}
                            alt={person.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <User className="w-12 h-12 text-amber-500" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>

                      <div className="text-center">
                        <h3 className="text-sm font-semibold line-clamp-1 group-hover:text-amber-500 transition-colors">
                          {person.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {person.knownFor || "Actor / Actress"}
                        </p>
                        <span className="inline-block mt-2 text-xs px-2.5 py-1 bg-amber-500/20 text-amber-500 rounded-full font-medium">
                          Celebrity
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Users Section */}
            {showUsers && users.length > 0 && (
              <section>
                {activeTab === 'all' && (
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      Users
                      <span className="text-base text-muted-foreground font-normal">({users.length})</span>
                    </h2>
                    {users.length > 6 && (
                      <button
                        onClick={() => setActiveTab('people')}
                        className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer font-medium"
                      >
                        View all →
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(activeTab === 'all' ? users.slice(0, 6) : users).map(user => (
                    <Link
                      key={user._id}
                      href={`/profile/${user._id}`}
                      className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl hover:bg-secondary/80 hover:ring-2 hover:ring-primary transition-all group cursor-pointer"
                    >
                      <Avatar className="w-14 h-14 ring-2 ring-transparent group-hover:ring-primary transition-all">
                        <AvatarImage src={user.avatar} alt={user.username} />
                        <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
                          {user.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          u/{user.username}
                        </h3>
                        {user.fullName && (
                          <p className="text-sm text-muted-foreground truncate">{user.fullName}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full font-medium">
                            Level {user.level || 1}
                          </span>
                          {user.points > 0 && (
                            <span className="text-xs text-muted-foreground font-medium">
                              {user.points} XP
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {isLoadingUsers && activeTab === 'people' && (
              <InlineLoadingSkeleton count={3} />
            )}

            {/* Infinite Scroll Loader for Movies/Celebrities */}
            {activeTab !== 'people' && currentPage < totalPages && (
              <div ref={loadMoreRef} className="flex justify-center py-12">
                {isLoadingMore && (
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-muted-foreground text-sm font-medium">Loading more results...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!isInitialLoading && query && (
          <>
            {activeTab === 'movies' && moviesAndTV.length === 0 && (
              <div className="flex flex-col items-center py-24 text-center">
                <div className="p-6 bg-secondary/50 rounded-full mb-6">
                  <Film className="w-16 h-16 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">No Movies or TV Shows Found</h2>
                <p className="text-muted-foreground max-w-md text-sm">
                  We couldn't find any movies or TV shows matching "<span className="text-primary font-medium">{query}</span>"
                </p>
              </div>
            )}
            {activeTab === 'celebrities' && celebrities.length === 0 && (
              <div className="flex flex-col items-center py-24 text-center">
                <div className="p-6 bg-amber-500/20 rounded-full mb-6">
                  <Star className="w-16 h-16 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">No Celebrities Found</h2>
                <p className="text-muted-foreground max-w-md text-sm">
                  We couldn't find any celebrities matching "<span className="text-primary font-medium">{query}</span>"
                </p>
              </div>
            )}
            {activeTab === 'people' && users.length === 0 && !isLoadingUsers && (
              <div className="flex flex-col items-center py-24 text-center">
                <div className="p-6 bg-primary/20 rounded-full mb-6">
                  <Users className="w-16 h-16 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">No Users Found</h2>
                <p className="text-muted-foreground max-w-md text-sm">
                  We couldn't find any users matching "<span className="text-primary font-medium">{query}</span>"
                </p>
              </div>
            )}
            {activeTab === 'all' && results.length === 0 && users.length === 0 && (
              <div className="flex flex-col items-center py-24 text-center">
                <div className="p-6 bg-secondary/50 rounded-full mb-6">
                  <Search className="w-16 h-16 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">No Results Found</h2>
                <p className="text-muted-foreground max-w-md text-sm">
                  We couldn't find anything matching "<span className="text-primary font-medium">{query}</span>"<br />
                  Try different keywords or check your spelling
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
