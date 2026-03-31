"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Film, Tv, User, Star, Users, Image } from "lucide-react"
import { searchMulti } from "@/lib/movies"
import useInfiniteScroll from "@/hooks/useInfiniteScroll"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SearchResultsSkeleton, InlineLoadingSkeleton } from "@/components/skeletons"
import { useUser } from "@/contexts/UserContext"
import { shouldFilterAdultContent } from "@/lib/utils/ageUtils"

const searchTabs = [
  { id: "all", label: "All", icon: Search },
  { id: "movies", label: "Movies & TV", icon: Film },
  { id: "celebrities", label: "Celebrities", icon: Star },
  { id: "communities", label: "Communities", icon: Users },
  { id: "posts", label: "Posts", icon: Image },
  { id: "people", label: "Users", icon: User },
]

const validTabs = new Set(searchTabs.map((tab) => tab.id))

const normalizeTab = (tab) => {
  if (tab === "celebrity") return "celebrities"
  return validTabs.has(tab) ? tab : "all"
}

const getPostHref = (post) =>
  post.community?.slug && post._id ? `/communities/${post.community.slug}/posts/${post._id}` : "/communities"

function EmptyState({ icon: Icon, title, description, className = "text-muted-foreground", bgClass = "bg-secondary/50" }) {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <div className={`p-6 rounded-full mb-6 ${bgClass}`}>
        <Icon className={`w-16 h-16 ${className}`} />
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md text-sm">{description}</p>
    </div>
  )
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useUser()
  const query = searchParams.get("q") || ""
  const initialTab = normalizeTab(searchParams.get("tab") || "all")
  const filterAdult = useMemo(() => shouldFilterAdultContent(user), [user])

  const [activeTab, setActiveTab] = useState(initialTab)
  const [results, setResults] = useState([])
  const [users, setUsers] = useState([])
  const [communities, setCommunities] = useState([])
  const [posts, setPosts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isInitialLoading, setIsInitialLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingExtras, setIsLoadingExtras] = useState(false)

  const usersAbortControllerRef = useRef(null)
  const extrasAbortControllerRef = useRef(null)
  const requestIdRef = useRef(0)

  const moviesAndTV = useMemo(() => results.filter((item) => item.mediaType !== "person"), [results])
  const celebrities = useMemo(() => results.filter((item) => item.mediaType === "person"), [results])

  const counts = useMemo(
    () => ({
      all: results.length + users.length + communities.length + posts.length,
      movies: moviesAndTV.length,
      celebrities: celebrities.length,
      communities: communities.length,
      posts: posts.length,
      people: users.length,
    }),
    [results.length, users.length, communities.length, posts.length, moviesAndTV.length, celebrities.length]
  )

  const hasAnyResults = counts.all > 0

  const performSearch = useCallback(
    async (searchTerm, page = 1, append = false, requestId = requestIdRef.current) => {
      if (!searchTerm.trim()) return
      append ? setIsLoadingMore(true) : setIsInitialLoading(true)

      try {
        const data = await searchMulti(searchTerm, page)
        if (requestId !== requestIdRef.current) return

        let nextResults = data.data?.results || []
        if (filterAdult) nextResults = nextResults.filter((item) => !item.adult)

        setResults((prev) => {
          const combined = append ? [...prev, ...nextResults] : nextResults
          return Array.from(new Map(combined.map((item) => [`${item.mediaType}-${item.id}`, item])).values())
        })
        setCurrentPage(data.data?.page || 1)
        setTotalPages(data.data?.totalPages || 0)
      } catch (error) {
        if (requestId !== requestIdRef.current) return
        console.error("Search failed:", error)
        if (!append) {
          setResults([])
          setCurrentPage(1)
          setTotalPages(0)
        }
      } finally {
        if (requestId === requestIdRef.current) {
          append ? setIsLoadingMore(false) : setIsInitialLoading(false)
        }
      }
    },
    [filterAdult]
  )

  const searchUsers = useCallback(async (searchTerm, requestId = requestIdRef.current) => {
    if (!searchTerm.trim()) return
    usersAbortControllerRef.current?.abort()
    const controller = new AbortController()
    usersAbortControllerRef.current = controller
    setIsLoadingUsers(true)

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}&limit=50`, {
        signal: controller.signal,
      })
      const data = await response.json()
      if (requestId !== requestIdRef.current) return
      setUsers(data.success ? data.users || [] : [])
    } catch (error) {
      if (error.name !== "AbortError" && requestId === requestIdRef.current) {
        console.error("Error searching users:", error)
        setUsers([])
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoadingUsers(false)
    }
  }, [])

  const searchExtras = useCallback(async (searchTerm, requestId = requestIdRef.current) => {
    if (!searchTerm.trim()) return
    extrasAbortControllerRef.current?.abort()
    const controller = new AbortController()
    extrasAbortControllerRef.current = controller
    setIsLoadingExtras(true)

    try {
      const [communitiesRes, postsRes] = await Promise.all([
        fetch(`/api/communities/search?q=${encodeURIComponent(searchTerm)}&limit=24`, {
          signal: controller.signal,
        }),
        fetch(`/api/communities/posts?search=${encodeURIComponent(searchTerm)}&limit=24`, {
          signal: controller.signal,
        }),
      ])
      const [communitiesData, postsData] = await Promise.all([communitiesRes.json(), postsRes.json()])
      if (requestId !== requestIdRef.current) return
      setCommunities(communitiesData.success ? communitiesData.communities || [] : [])
      setPosts(postsData.success ? postsData.data || [] : [])
    } catch (error) {
      if (error.name !== "AbortError" && requestId === requestIdRef.current) {
        console.error("Error searching communities/posts:", error)
        setCommunities([])
        setPosts([])
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoadingExtras(false)
    }
  }, [])

  const loadMore = useCallback(() => {
    if (currentPage < totalPages && !isLoadingMore) {
      performSearch(query, currentPage + 1, true)
    }
  }, [currentPage, totalPages, isLoadingMore, query, performSearch])

  const loadMoreRef = useInfiniteScroll(loadMore, currentPage < totalPages, isLoadingMore, 200)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (!query) {
      router.push("/")
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    performSearch(query, 1, false, requestId)
    searchUsers(query, requestId)
    searchExtras(query, requestId)

    return () => {
      usersAbortControllerRef.current?.abort()
      extrasAbortControllerRef.current?.abort()
    }
  }, [query, router, performSearch, searchUsers, searchExtras])

  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (activeTab === "all") params.delete("tab")
    else params.set("tab", activeTab)
    const nextQuery = params.toString()
    window.history.replaceState(null, "", nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname)
  }, [activeTab, searchParams])

  const renderSectionHeader = (title, count, icon, onViewAll) => {
    const Icon = icon
    return (
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          {title}
          <span className="text-base text-muted-foreground font-normal">({count})</span>
        </h2>
        {count > 6 && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer font-medium"
          >
            View all
          </button>
        )}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-16 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">
            Search Results for "<span className="text-primary">{query}</span>"
          </h1>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {searchTabs.map((tab) => {
              const Icon = tab.icon
              const count = counts[tab.id] || 0
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        activeTab === tab.id
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {isInitialLoading && results.length === 0 && <SearchResultsSkeleton />}

        {!isInitialLoading && (
          <div className="space-y-12">
            {(activeTab === "all" || activeTab === "movies") && moviesAndTV.length > 0 && (
              <section>
                {activeTab === "all" && renderSectionHeader("Movies & TV Shows", moviesAndTV.length, Film, () => setActiveTab("movies"))}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
                  {(activeTab === "all" ? moviesAndTV.slice(0, 7) : moviesAndTV).map((item) => (
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
                            {item.mediaType === "tv" ? <Tv className="w-12 h-12 text-muted-foreground" /> : <Film className="w-12 h-12 text-muted-foreground" />}
                          </div>
                        )}
                        <div className="absolute top-2 left-2 text-xs px-2 py-1 bg-black/80 backdrop-blur-sm text-white rounded font-medium">
                          {item.mediaType === "tv" ? "TV" : "Movie"}
                        </div>
                      </div>
                      <h3 className="text-xs sm:text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.releaseDate?.split("-")[0] || "N/A"}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {(activeTab === "all" || activeTab === "celebrities") && celebrities.length > 0 && (
              <section>
                {activeTab === "all" && renderSectionHeader("Celebrities", celebrities.length, Star, () => setActiveTab("celebrities"))}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                  {(activeTab === "all" ? celebrities.slice(0, 6) : celebrities).map((person) => (
                    <Link key={`celebrity-${person.id}`} href={`/actor/${person.id}`} className="group cursor-pointer">
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
                      </div>
                      <div className="text-center">
                        <h3 className="text-sm font-semibold line-clamp-1 group-hover:text-amber-500 transition-colors">{person.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{person.knownFor || "Actor / Actress"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {(activeTab === "all" || activeTab === "communities") && communities.length > 0 && (
              <section>
                {activeTab === "all" && renderSectionHeader("Communities", communities.length, Users, () => setActiveTab("communities"))}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(activeTab === "all" ? communities.slice(0, 6) : communities).map((community) => (
                    <Link
                      key={community._id}
                      href={`/communities/${community.slug}`}
                      className="group rounded-2xl border border-border bg-secondary/40 p-5 hover:bg-secondary/70 hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        {community.icon ? (
                          <img src={community.icon} alt={community.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                            <Users className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">c/{community.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {community.description || "Join the conversation in this community."}
                          </p>
                          <p className="text-xs text-muted-foreground mt-3">
                            {community.memberCount === 1 ? "1 member" : `${community.memberCount || 0} members`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {(activeTab === "all" || activeTab === "posts") && posts.length > 0 && (
              <section>
                {activeTab === "all" && renderSectionHeader("Posts", posts.length, Image, () => setActiveTab("posts"))}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {(activeTab === "all" ? posts.slice(0, 6) : posts).map((post) => (
                    <Link
                      key={post._id}
                      href={getPostHref(post)}
                      className="group rounded-2xl border border-border bg-secondary/40 p-5 hover:bg-secondary/70 hover:border-primary/40 transition-all"
                    >
                      <p className="text-xs text-muted-foreground mb-2">
                        {post.community?.name ? `c/${post.community.name}` : "Community"}
                        {post.user?.username ? ` • u/${post.user.username}` : ""}
                      </p>
                      <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                        {post.content || "Open this post to see the full discussion."}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {(activeTab === "all" || activeTab === "people") && users.length > 0 && (
              <section>
                {activeTab === "all" && renderSectionHeader("Users", users.length, User, () => setActiveTab("people"))}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(activeTab === "all" ? users.slice(0, 6) : users).map((person) => (
                    <Link
                      key={person._id}
                      href={`/profile/${person._id}`}
                      className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl hover:bg-secondary/80 hover:ring-2 hover:ring-primary transition-all group cursor-pointer"
                    >
                      <Avatar className="w-14 h-14 ring-2 ring-transparent group-hover:ring-primary transition-all">
                        <AvatarImage src={person.avatar} alt={person.username} />
                        <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
                          {person.username?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold group-hover:text-primary transition-colors truncate">u/{person.username}</h3>
                        {person.fullName && <p className="text-sm text-muted-foreground truncate">{person.fullName}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {isLoadingUsers && activeTab === "people" && <InlineLoadingSkeleton count={3} />}
            {isLoadingExtras && (activeTab === "communities" || activeTab === "posts") && <InlineLoadingSkeleton count={3} />}

            {(activeTab === "all" || activeTab === "movies" || activeTab === "celebrities") && currentPage < totalPages && (
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

        {!isInitialLoading && query && !isLoadingUsers && !isLoadingExtras && (
          <>
            {activeTab === "movies" && moviesAndTV.length === 0 && (
              <EmptyState
                icon={Film}
                title="No Movies or TV Shows Found"
                description={
                  <>
                    We couldn't find any movies or TV shows matching "<span className="text-primary font-medium">{query}</span>"
                  </>
                }
              />
            )}
            {activeTab === "celebrities" && celebrities.length === 0 && (
              <EmptyState
                icon={Star}
                title="No Celebrities Found"
                description={
                  <>
                    We couldn't find any celebrities matching "<span className="text-primary font-medium">{query}</span>"
                  </>
                }
                className="text-amber-500"
                bgClass="bg-amber-500/20"
              />
            )}
            {activeTab === "communities" && communities.length === 0 && (
              <EmptyState
                icon={Users}
                title="No Communities Found"
                description={
                  <>
                    We couldn't find any communities matching "<span className="text-primary font-medium">{query}</span>"
                  </>
                }
                className="text-primary"
                bgClass="bg-primary/20"
              />
            )}
            {activeTab === "posts" && posts.length === 0 && (
              <EmptyState
                icon={Image}
                title="No Posts Found"
                description={
                  <>
                    We couldn't find any posts matching "<span className="text-primary font-medium">{query}</span>"
                  </>
                }
                className="text-primary"
                bgClass="bg-primary/20"
              />
            )}
            {activeTab === "people" && users.length === 0 && (
              <EmptyState
                icon={User}
                title="No Users Found"
                description={
                  <>
                    We couldn't find any users matching "<span className="text-primary font-medium">{query}</span>"
                  </>
                }
                className="text-primary"
                bgClass="bg-primary/20"
              />
            )}
            {activeTab === "all" && !hasAnyResults && (
              <EmptyState
                icon={Search}
                title="No Results Found"
                description={
                  <>
                    We couldn't find anything matching "<span className="text-primary font-medium">{query}</span>"
                    <br />
                    Try different keywords or check your spelling
                  </>
                }
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}
