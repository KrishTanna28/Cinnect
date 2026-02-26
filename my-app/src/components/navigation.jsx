"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Search, X, User, LogOut, Settings, Home, Compass, Users, Film, Tv, MessageCircle, Loader2, Bot, Clock, Trash2, Bell } from "lucide-react"
import { Comfortaa } from "next/font/google"
import NotificationBell from "@/components/notification-bell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useUser } from "@/contexts/UserContext"

const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["700"],
})

const searchCategories = [
  { id: 'all', label: 'All' },
  { id: 'movies', label: 'Movies & TV' },
  { id: 'celebrity', label: 'Celebrity' },
  { id: 'communities', label: 'Communities' },
  { id: 'posts', label: 'Posts' },
  { id: 'people', label: 'People' },
]

export default function Navigation() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [hasBackground, setHasBackground] = useState(false)
  const [isAtTop, setIsAtTop] = useState(true)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [activeSearchCategory, setActiveSearchCategory] = useState('all')
  const [searchResults, setSearchResults] = useState({
    movies: [],
    celebrities: [],
    communities: [],
    posts: [],
    people: []
  })
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchRef = useRef(null)
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, logout } = useUser()
  const [showProfilePopup, setShowProfilePopup] = useState(false)
  const profilePopupRef = useRef(null)

  // Search history state
  const [searchHistory, setSearchHistory] = useState([])
  const [searchHistoryLoaded, setSearchHistoryLoaded] = useState(false)

  // Close profile popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profilePopupRef.current && !profilePopupRef.current.contains(event.target)) {
        setShowProfilePopup(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check if we're on a specific community page (slug page - transparent navbar at top)
  // Match /communities/[slug] but not /communities, /communities/[slug]/new-post, /communities/[slug]/edit, /communities/[slug]/posts/[id]
  const isCommunitySlugPage = pathname?.match(/^\/communities\/[^\/]+$/) !== null

  // Perform search across all categories
  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults({ movies: [], celebrities: [], communities: [], posts: [], people: [] })
      return
    }

    setIsSearching(true)
    try {
      const [moviesRes, communitiesRes, postsRes, peopleRes] = await Promise.allSettled([
        // Movies & TV from TMDB (multi search)
        fetch(`/api/movies/search/multi?q=${encodeURIComponent(query)}&page=1`).then(r => r.json()),
        // Communities
        fetch(`/api/communities/search?q=${encodeURIComponent(query)}&limit=5`).then(r => r.json()),
        // Posts
        fetch(`/api/communities/posts?search=${encodeURIComponent(query)}&limit=5`).then(r => r.json()),
        // People/Users
        fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=5`).then(r => r.json())
      ])

      // Separate celebrities (persons) from movies/TV
      const allMediaResults = moviesRes.status === 'fulfilled' ? (moviesRes.value.data?.results || []) : []
      const moviesAndTV = allMediaResults.filter(item => item.mediaType !== 'person').slice(0, 5)
      const celebrities = allMediaResults.filter(item => item.mediaType === 'person').slice(0, 5)

      setSearchResults({
        movies: moviesAndTV,
        celebrities: celebrities,
        communities: communitiesRes.status === 'fulfilled' ? (communitiesRes.value.communities || []) : [],
        posts: postsRes.status === 'fulfilled' ? (postsRes.value.data?.slice(0, 5) || []) : [],
        people: peopleRes.status === 'fulfilled' ? (peopleRes.value.users || []) : []
      })
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearch = (e) => {
    if (e) e.preventDefault()
    if (searchQuery.trim()) {
      setShowSearchDropdown(false)
      // Save the search query to history
      saveSearchQuery(searchQuery.trim())
      if (activeSearchCategory === 'all' || activeSearchCategory === 'movies') {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      } else if (activeSearchCategory === 'celebrity') {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}&tab=celebrities`)
      } else if (activeSearchCategory === 'communities') {
        router.push(`/communities?search=${encodeURIComponent(searchQuery.trim())}`)
      } else if (activeSearchCategory === 'posts') {
        router.push(`/communities?search=${encodeURIComponent(searchQuery.trim())}&tab=posts`)
      } else if (activeSearchCategory === 'people') {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}&tab=people`)
      }
    }
  }

  // Debounced search for live results
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ movies: [], celebrities: [], communities: [], posts: [], people: [] })
      return
    }

    setShowSearchDropdown(true)
    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, performSearch])

  // Show search history when input is focused and query is empty
  useEffect(() => {
    if (!searchQuery.trim() && isSearchFocused && user && searchHistory.length > 0) {
      setShowSearchDropdown(true)
    }
  }, [searchQuery, isSearchFocused, user, searchHistory.length])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle scroll to show/hide navbar and change background
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Add background when scrolled past 100px
      setHasBackground(currentScrollY > 100)

      // Track whether we're at the very top
      setIsAtTop(currentScrollY < 10)

      if (currentScrollY < 10) {
        // Always show navbar at top
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past 100px - hide navbar
        setIsVisible(false)
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show navbar
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const handleLogout = () => {
    logout()
  }

  // Toggle AI assistant - find and click the floating button
  const toggleAIAssistant = () => {
    // The AI assistant has its own toggle button; we simulate a click on it
    const aiButton = document.querySelector('[data-ai-toggle]')
    if (aiButton) {
      aiButton.click()
    }
  }

  // Fetch search history from the API
  const fetchSearchHistory = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      const res = await fetch("/api/search/log", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          const items = json.history || []
          setSearchHistory(items)
          setSearchHistoryLoaded(true)
          if (items.length > 0) {
            setShowSearchDropdown(true)
          }
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Save a search query to history
  const saveSearchQuery = useCallback(async (query) => {
    const token = localStorage.getItem("token")
    if (!token || !query) return
    try {
      await fetch("/api/search/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
      })
      // Refresh the history cache
      setSearchHistoryLoaded(false)
    } catch {
      // ignore
    }
  }, [])

  // Clear all search history
  const clearSearchHistory = useCallback(async () => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      await fetch("/api/search/log", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      setSearchHistory([])
      setShowSearchDropdown(false)
    } catch {
      // ignore
    }
  }, [])

  // Delete a single search history entry
  const deleteSearchEntry = useCallback(async (entryId) => {
    const token = localStorage.getItem("token")
    if (!token) return
    try {
      await fetch(`/api/search/log?id=${entryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      setSearchHistory((prev) => prev.filter((e) => e._id !== entryId))
    } catch {
      // ignore
    }
  }, [])

  // When search input is focused with no query, show history
  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true)
    if (searchQuery.trim()) {
      setShowSearchDropdown(true)
    } else if (user) {
      if (searchHistoryLoaded && searchHistory.length > 0) {
        setShowSearchDropdown(true)
      } else if (!searchHistoryLoaded) {
        fetchSearchHistory()
      }
    }
  }, [searchQuery, user, searchHistoryLoaded, searchHistory.length, fetchSearchHistory])

  return (
    <>
      {/* Main Navbar (desktop only) */}
      <nav
        className={`fixed top-0 left-0 right-0 z-30 transition-all duration-500
          ${isVisible ? 'translate-y-0' : 'md:-translate-y-full'}
          ${isAtTop
            ? 'bg-transparent border-none'
            : 'bg-black/90 backdrop-blur-md border-b border-white/10'}
          ${hasBackground
            ? 'md:bg-background md:backdrop-blur md:border-b md:border-border'
            : 'md:bg-transparent md:border-none'}`}
      >
        <div className="w-full px-4 sm:px-6">
          <div className="relative flex items-center justify-between h-16">
            {/* Mobile: invisible spacer left | centered logo | bell right */}
            <div className="sm:hidden w-8 flex-shrink-0" />
            <Link href="/" className={`sm:hidden absolute left-1/2 -translate-x-1/2 ${comfortaa.className} font-bold text-2xl text-primary`} style={{ textShadow: hasBackground ? 'none' : '0 2px 4px rgba(0,0,0,0.8)' }}>
              cinnect
            </Link>
            {!isLoading && user && (
              <div className="sm:hidden ml-auto">
                <NotificationBell />
              </div>
            )}
            {/* Logo - Desktop */}
            <Link href="/" className={`hidden sm:flex items-center gap-2 ${comfortaa.className} font-bold text-2xl text-primary cursor-pointer`} style={{ textShadow: hasBackground ? 'none' : '0 2px 4px rgba(0,0,0,0.8)' }}>
              cinnect
            </Link>

            {/* Center Search - Desktop Only - Always Visible */}
            {user && <div
              className="hidden md:flex flex-1 justify-center max-w-xl mx-8"
              ref={searchRef}
            >
              <div className="relative w-full">
                <form onSubmit={handleSearch} className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={handleSearchFocus}
                    onBlur={() => setIsSearchFocused(false)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                    className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-full text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                  )}
                </form>

                {/* Search Dropdown */}
                {showSearchDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">

                    {/* Search History (shown when query is empty) */}
                    {!searchQuery.trim() && searchHistory.length > 0 && (
                      <div className="py-1">
                        {searchHistory.map((entry) => (
                          <div
                            key={entry._id}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors group cursor-pointer"
                          >
                            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSearchQuery(entry.query);
                                setShowSearchDropdown(false);
                                router.push(`/search?q=${encodeURIComponent(entry.query)}`);
                              }}
                              className="flex-1 text-left text-sm text-foreground truncate cursor-pointer"
                            >
                              {entry.query}
                            </button>
                            <button
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deleteSearchEntry(entry._id); }}
                              className="flex-shrink-0 p-1 rounded-full text-muted-foreground hover:text-primary group-hover:opacity-100 cursor-pointer transition-all active:scale-90"
                              aria-label="Remove from history"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {/* Clear all button */}
                        <div className="border-t border-border mt-1 pt-1 px-3 pb-1">
                          <button
                            onMouseDown={(e) => { e.preventDefault(); clearSearchHistory(); }}
                            className="w-full text-xs text-muted-foreground hover:text-destructive transition-all active:scale-95 flex items-center justify-center gap-1.5 py-2 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Clear all search history
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Regular search results (shown when query is not empty) */}
                    {searchQuery.trim() && (
                      <>
                    {/* Category Tabs */}
                    <div className="flex items-center gap-1 p-2 border-b border-border bg-secondary/30 overflow-x-auto">
                      {searchCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveSearchCategory(cat.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${activeSearchCategory === cat.id
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Results */}
                    <div className="p-2">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      ) : (
                        <>
                          {/* Movies & TV Results */}
                          {(activeSearchCategory === 'all' || activeSearchCategory === 'movies') && searchResults.movies.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">Movies & TV</h4>
                              <div className="space-y-1">
                                {searchResults.movies.map((item) => (
                                  <Link
                                    key={`${item.mediaType}-${item.id}`}
                                    href={item.mediaType === 'tv' ? `/tv/${item.id}` : `/movies/${item.id}`}
                                    onClick={() => { saveSearchQuery(searchQuery.trim()); setShowSearchDropdown(false); setSearchQuery(''); }}
                                    className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                                  >
                                    {item.poster ? (
                                      <img src={item.poster} alt="" className="w-10 h-14 object-cover rounded" />
                                    ) : (
                                      <div className="w-10 h-14 bg-secondary rounded flex items-center justify-center">
                                        {item.mediaType === 'tv' ? <Tv className="w-5 h-5 text-muted-foreground" /> :
                                          <Film className="w-5 h-5 text-muted-foreground" />}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.mediaType === 'tv' ? 'TV Show' : 'Movie'}
                                        {item.releaseDate && ` • ${item.releaseDate.split('-')[0]}`}
                                      </p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Celebrity Results */}
                          {(activeSearchCategory === 'all' || activeSearchCategory === 'celebrity') && searchResults.celebrities.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">Celebrities</h4>
                              <div className="space-y-1">
                                {searchResults.celebrities.map((person) => (
                                  <Link
                                    key={`celebrity-${person.id}`}
                                    href={`/actor/${person.id}`}
                                    onClick={() => { saveSearchQuery(searchQuery.trim()); setShowSearchDropdown(false); setSearchQuery(''); }}
                                    className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                                  >
                                    {person.poster ? (
                                      <img src={person.poster} alt="" className="w-10 h-10 object-cover rounded-full" />
                                    ) : (
                                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{person.title}</p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {person.knownFor || 'Actor / Actress'}
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0">
                                      <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-500 rounded-full">Celebrity</span>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Communities Results */}
                          {(activeSearchCategory === 'all' || activeSearchCategory === 'communities') && searchResults.communities.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">Communities</h4>
                              <div className="space-y-1">
                                {searchResults.communities.map((community) => (
                                  <Link
                                    key={community._id}
                                    href={`/communities/${community.slug}`}
                                    onClick={() => { setShowSearchDropdown(false); setSearchQuery(''); }}
                                    className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                                  >
                                    {community.icon ? (
                                      <img src={community.icon} alt="" className="w-10 h-10 object-cover rounded-full" />
                                    ) : (
                                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                        <Users className="w-5 h-5 text-primary" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">c/{community.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{community.memberCount == 1 ? "1 member" : `${community.memberCount || 0} members`}</p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Posts Results */}
                          {(activeSearchCategory === 'all' || activeSearchCategory === 'posts') && searchResults.posts.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">Posts</h4>
                              <div className="space-y-1">
                                {searchResults.posts.map((post) => (
                                  <Link
                                    key={post._id}
                                    href={`/communities/${post.community?.slug}`}
                                    onClick={() => { setShowSearchDropdown(false); setSearchQuery(''); }}
                                    className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                                  >
                                    <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center flex-shrink-0">
                                      <MessageCircle className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        in c/{post.community?.name} • by u/{post.user?.username}
                                      </p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* People Results */}
                          {(activeSearchCategory === 'all' || activeSearchCategory === 'people') && searchResults.people.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-2">Users</h4>
                              <div className="space-y-1">
                                {searchResults.people.map((person) => (
                                  <Link
                                    key={person._id}
                                    href={`/profile/${person._id}`}
                                    onClick={() => { setShowSearchDropdown(false); setSearchQuery(''); }}
                                    className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
                                  >
                                    {person.avatar ? (
                                      <img src={person.avatar} alt="" className="w-10 h-10 object-cover rounded-full" />
                                    ) : (
                                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">u/{person.username}</p>
                                      {person.fullName && <p className="text-xs text-muted-foreground truncate">{person.fullName}</p>}
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* No Results */}
                          {!isSearching &&
                            searchResults.movies.length === 0 &&
                            searchResults.celebrities.length === 0 &&
                            searchResults.communities.length === 0 &&
                            searchResults.posts.length === 0 &&
                            searchResults.people.length === 0 && (
                              <div className="text-center py-8">
                                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No results found for "{searchQuery}"</p>
                              </div>
                            )}

                          {/* View All Results */}
                          {(searchResults.movies.length > 0 || searchResults.celebrities.length > 0 || searchResults.communities.length > 0 || searchResults.posts.length > 0 || searchResults.people.length > 0) && (
                            <button
                              onClick={handleSearch}
                              className="w-full mt-2 p-2 text-sm text-primary hover:bg-secondary rounded-lg transition-colors cursor-pointer text-center"
                            >
                              View all results for "{searchQuery}"
                            </button>
                          )}
                        </>
                      )}
                    </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>}

            {/* Right Side - Nav Icons + Profile */}
            <div className="hidden md:flex items-center gap-2">
              {!isLoading && user && (
                <>
                  {/* Navigation Icons */}
                  <Link href="/" className="p-2 text-foreground hover:text-primary transition-all active:scale-90 cursor-pointer" title="Home">
                    <Home className="w-5 h-5" />
                  </Link>
                  <Link href="/browse" className="p-2 text-foreground hover:text-primary transition-all active:scale-90 cursor-pointer" title="Browse">
                    <Compass className="w-5 h-5" />
                  </Link>
                  <Link href="/communities" className="p-2 text-foreground hover:text-primary transition-all active:scale-90 cursor-pointer" title="Communities">
                    <Users className="w-5 h-5" />
                  </Link>

                  <NotificationBell />

                  <div />
                </>
              )}

              {/* Profile / Auth Buttons */}
              {!isLoading && (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                        <Avatar className="w-10 h-10 border-2 border-primary">
                          <AvatarImage src={user.avatar} alt={user.username} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">{user.fullName || user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/profile')}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => router.push('/login')}>
                      Login
                    </Button>
                    <Button onClick={() => router.push('/signup')}>
                      Sign Up
                    </Button>
                  </div>
                )
              )}
            </div>

          </div>

        </div>
      </nav>



      {/* Mobile Bottom Navigation Bar - Instagram style */}
      {!isLoading && user && (
        <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-background/95 backdrop-blur border-t border-border">
          <div className="flex items-center justify-around h-14">
            {/* Home */}
            <Link
              href="/"
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'
                }`}
            >
              <Home className="w-6 h-6" strokeWidth={pathname === '/' ? 2.5 : 1.5} />
            </Link>

            {/* Browse */}
            <Link
              href="/browse"
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 ${pathname === '/browse' ? 'text-primary' : 'text-muted-foreground'
                }`}
            >
              <Compass className="w-6 h-6" strokeWidth={pathname === '/browse' ? 2.5 : 1.5} />
            </Link>

            {/* Communities */}
            <Link
              href="/communities"
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 ${pathname?.startsWith('/communities') ? 'text-primary' : 'text-muted-foreground'
                }`}
            >
              <Users className="w-6 h-6" strokeWidth={pathname?.startsWith('/communities') ? 2.5 : 1.5} />
            </Link>

            {/* AI Chatbot */}
            <button
              onClick={toggleAIAssistant}
              className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-all active:scale-90 cursor-pointer"
            >
              <Bot className="w-6 h-6" strokeWidth={1.5} />
            </button>

            {/* Profile (avatar with popup) */}
            <div className="relative flex flex-col items-center justify-center flex-1 h-full" ref={profilePopupRef}>
              <button
                onClick={() => setShowProfilePopup(!showProfilePopup)}
                className="flex items-center justify-center cursor-pointer"
              >
                <Avatar className={`w-7 h-7 ${pathname === '/profile' ? 'ring-2 ring-primary' : 'ring-1 ring-border'
                  }`}>
                  <AvatarImage src={user.avatar} alt={user.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>

              {/* Profile Popup (opens above) */}
              {showProfilePopup && (
                <div className="absolute bottom-full right-0 mb-3 w-52 bg-background border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-1000">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-border bg-secondary/30">
                    <p className="text-sm font-semibold text-foreground truncate">{user.fullName || user.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowProfilePopup(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setShowProfilePopup(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setShowProfilePopup(false)
                        handleLogout()
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-secondary transition-all active:scale-95 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav: show login/signup if not authenticated */}
      {!isLoading && !user && (
        <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-background/95 backdrop-blur border-t border-border">
          <div className="flex items-center gap-2 p-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/login')}
            >
              Login
            </Button>
            <Button
              className="flex-1"
              onClick={() => router.push('/signup')}
            >
              Sign Up
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
