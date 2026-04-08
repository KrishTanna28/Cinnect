"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Clapperboard, Users, MessageSquareText, Sparkles, Newspaper, ThumbsUp, Star } from "lucide-react"

const featureCards = [
  {
    icon: Clapperboard,
    title: "Review What You Watch",
    description: "Rate movies and shows, write spoiler-safe reviews, and build your voice as a cinephile.",
  },
  {
    icon: Users,
    title: "Find Your Taste Circle",
    description: "Follow people with similar preferences and discover titles through real recommendations.",
  },
  {
    icon: MessageSquareText,
    title: "Join Communities",
    description: "Discuss scenes, endings, theories, and hidden gems inside topic-based communities.",
  },
  {
    icon: Sparkles,
    title: "Meet C.A.S.T",
    description: "Use C.A.S.T - your Cinematic Assistant for Smart Tastes - to discover what to watch next, explore trends, and get smarter recommendations.",
  },
]

export default function LandingPage({
  featuredItems = [],
  news = [],
  communityReviews = [],
  curatedLists = [],
  topReviewers = [],
}) {
  const heroItems = useMemo(
    () => featuredItems.filter((item) => item?.backdrop || item?.poster),
    [featuredItems]
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [landingNews, setLandingNews] = useState(news)

  useEffect(() => {
    if (heroItems.length < 2) return

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev === heroItems.length - 1 ? 0 : prev + 1))
    }, 6000)

    return () => clearInterval(interval)
  }, [heroItems.length])

  useEffect(() => {
    setLandingNews(news)
  }, [news])

  useEffect(() => {
    if (landingNews.length > 0) return

    let isCancelled = false

    const fetchLandingNews = async () => {
      try {
        const response = await fetch('/api/news?q=movie&page=1')
        const json = await response.json()

        if (!isCancelled && response.ok && json?.success) {
          setLandingNews(json.data?.articles || [])
        }
      } catch {
        // Keep existing empty state if API fetch fails.
      }
    }

    fetchLandingNews()

    return () => {
      isCancelled = true
    }
  }, [landingNews.length])

  const activeHero = heroItems[activeIndex] || null

  const formatCount = (value = 0) => new Intl.NumberFormat("en-IN").format(value)
  const toTenScale = (rating = 0) => {
    const normalized = Math.max(0, Math.min(10, Number(rating || 0)))
    const rounded = Math.round(normalized * 10) / 10
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  }

  const getStoryPreview = (article) => {
    const description = (article?.description || "").trim()
    const rawContent = (article?.content || "").trim()
    const cleanContent = rawContent.replace(/\s*\[\+\d+\schars\]$/i, "").trim()

    const merged = cleanContent && description
      ? `${description}\n\n${cleanContent}`
      : (cleanContent || description || "Read the full story for more details.")

    return merged.length > 1200 ? `${merged.slice(0, 1200)}...` : merged
  }

  const getArticleImageRatio = (article) => {
    const seedSource = `${article?.url || ""}|${article?.title || ""}`
    let hash = 0
    for (let i = 0; i < seedSource.length; i += 1) {
      hash = (hash * 31 + seedSource.charCodeAt(i)) | 0
    }

    const contentLen = (article?.content || article?.description || "").length
    const contentWeight = Math.min(5, Math.floor(contentLen / 260))
    const variants = [1.45, 1.6, 1.75, 1.9, 2.05, 2.2]
    return variants[Math.abs(hash + contentWeight) % variants.length]
  }

  const getArticlePreviewConfig = (article, previewText) => {
    const hasImage = Boolean(article?.urlToImage)
    const baseChars = hasImage ? 360 : 560
    const maxChars = Math.min(baseChars + 120, baseChars + Math.floor(previewText.length * 0.12))
    const text = previewText.length > maxChars ? `${previewText.slice(0, maxChars)}...` : previewText

    const baseHeight = hasImage ? 110 : 150
    const growth = Math.min(120, Math.floor(text.length / 7))

    return {
      text,
      style: { maxHeight: `${baseHeight + growth}px` },
    }
  }

  const popularListRow = useMemo(() => {
    const expandCarouselItems = (items = [], minCount = 8, maxCount = 14) => {
      const cleanItems = items.filter((item) => item?.poster)
      if (cleanItems.length === 0) return []
      if (cleanItems.length >= minCount) return cleanItems.slice(0, maxCount)

      const expanded = []
      while (expanded.length < minCount) {
        expanded.push(...cleanItems)
      }

      return expanded.slice(0, minCount)
    }

    const normalizeItem = (item, fallbackKey, index) => ({
      id: item?.id || item?._id || `${fallbackKey}-${index}`,
      title: item?.title || item?.name || "Untitled",
      poster: item?.poster || item?.posterPath || item?.image || "",
    })

    const findListByTitle = (pattern) => {
      return curatedLists.find((list) => pattern.test((list?.title || "").toLowerCase())) || null
    }

    const itemsFromList = (list, key) => {
      const mapped = (list?.items || []).map((item, index) => normalizeItem(item, key, index))
      return expandCarouselItems(mapped)
    }

    const itemsFromFeatured = (filterFn, key) => {
      const mapped = featuredItems
        .filter(filterFn)
        .map((item, index) => normalizeItem(item, key, index))
      return expandCarouselItems(mapped)
    }

    const trendingList =
      findListByTitle(/trend|trending|hot|now|popular|top/) ||
      curatedLists.find((list) => Array.isArray(list?.items) && list.items.length > 0) ||
      null

    const trendingItems = itemsFromList(trendingList, "trending-list")

    return {
      items:
        trendingItems.length > 0
          ? trendingItems
          : itemsFromFeatured((item) => Boolean(item?.poster || item?.posterPath), "trending-featured"),
    }
  }, [curatedLists, featuredItems])

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative -mt-16 min-h-[92vh] sm:min-h-[105vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
          style={{
            backgroundImage: activeHero?.backdrop
              ? `url('${activeHero.backdrop}')`
              : "linear-gradient(120deg, #0a0f1c 0%, #131f3a 55%, #0f172a 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />

        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="max-w-6xl mx-auto mt-8 sm:mt-10 grid gap-3 md:gap-3 md:grid-cols-[1fr_240px] items-center">
            <div className="order-2 md:order-1">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-white text-balance">
                Where cinema connects people.
              </h1>
              <p className="mt-5 max-w-2xl text-base sm:text-lg text-white/85">
                Review films and shows you have watched, connect with people who share your taste,
                and join communities that never run out of things to talk about.
              </p>  
            </div>

            <div className="order-1 md:order-2 flex justify-center md:justify-start mb-2 md:mb-0">
              <div className="relative h-[260px] w-[176px] sm:h-[300px] sm:w-[205px] md:h-[340px] md:w-[230px] rounded-2xl border border-white/20 bg-black/20 shadow-2xl backdrop-blur-sm overflow-hidden">
                {activeHero?.poster ? (
                  <img
                    src={activeHero.poster}
                    alt="Featured poster"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-b from-slate-700 to-slate-900" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold">What Cinnect lets you do</h2>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {featureCards.map((card) => {
            const Icon = card.icon
            return (
              <article
                key={card.title}
                className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{card.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5 items-start">
          <div className="rounded-2xl border border-border/60 bg-card/70 p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-5">Top Reviews</h2>
            </div>

            <div className="space-y-3">
              {communityReviews.slice(0, 5).map((review) => (
                <article key={review._id} className="border-b border-border/40 pb-3 last:border-b-0 last:pb-0">
                  <div className="flex gap-2.5 sm:gap-3.5">
                    <Link href={`/reviews/${review.mediaType}/${review.mediaId}`} className="flex-shrink-0">
                      <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-md overflow-hidden border border-border/60 bg-secondary">
                        {review.poster ? (
                          <img
                            src={review.poster}
                            alt={review.mediaTitle}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-slate-700 to-slate-900" />
                        )}
                      </div>
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link href={`/reviews/${review.mediaType}/${review.mediaId}`} className="font-bold text-lg sm:text-xl leading-tight hover:text-primary transition-colors">
                          {review.mediaTitle}
                        </Link>
                        {review.releaseYear && (
                          <span className="text-muted-foreground text-sm">{review.releaseYear}</span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <Link href={`/profile/${review.userId}`} className="font-semibold text-foreground/90 hover:text-primary transition-colors line-clamp-1">
                          {review.username}
                        </Link>
                        <span className="inline-flex items-center gap-1 text-primary font-semibold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {toTenScale(review.rating)}/10
                        </span>
                      </div>

                      <p className="mt-1.5 text-sm text-foreground/90 line-clamp-2">{review.excerpt}</p>

                      <div className="mt-1.5 inline-flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {formatCount(review.likesCount) == 1 ? "1 like" : `${formatCount(review.likesCount)} likes`}
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {communityReviews.length === 0 && (
                <p className="text-sm text-muted-foreground">No community reviews available right now.</p>
              )}
            </div>
          </div>

          <aside className="space-y-3 min-w-0">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Popular Lists</h2>
              </div>

              <div className="space-y-3">
                <Link
                  key={popularListRow.key}
                  href="/login"
                  className="group block rounded-lg border border-border/60 bg-card/40 px-3 py-2 hover:border-primary/40 transition-colors"
                >
                  <div className="relative h-[90px] w-full overflow-hidden rounded-md border border-border/60 bg-secondary/35 landing-carousel-hover">
                    {popularListRow.items.length > 0 ? (
                      <div
                        className={`landing-carousel-marquee ${popularListRow.items.length > 1 ? "landing-carousel-running" : ""}`}
                        style={{ "--carousel-duration": "22s" }}
                      >
                        <div className="landing-carousel-segment">
                          {popularListRow.items.map((item, index) => (
                            <div
                              key={`${popularListRow.key}-${item.id}-${index}`}
                              className="relative h-[86px] min-w-[68px] rounded-md overflow-hidden border border-border/60 bg-card"
                            >
                              <img
                                src={item.poster}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="landing-carousel-segment" aria-hidden="true">
                          {popularListRow.items.map((item, index) => (
                            <div
                              key={`${popularListRow.key}-clone-${item.id}-${index}`}
                              className="relative h-[86px] min-w-[68px] rounded-md overflow-hidden border border-border/60 bg-card"
                            >
                              <img
                                src={item.poster}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <p className="text-xs text-muted-foreground">No titles available right now.</p>
                      </div>
                    )}
                  </div>
                </Link>

                {popularListRow.items.length === 0 && (
                  <p className="text-sm text-muted-foreground">No lists available right now.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/70 p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-5">Popular Reviewers</h2>
              </div>

              <div className="space-y-2.5">
                {topReviewers.slice(0, 5).map((reviewer, index) => (
                  <article key={`${reviewer._id || reviewer.id}-${index}`} className="flex items-center gap-2.5 pb-2.5 border-b border-border/40 last:border-b-0 last:pb-0">
                    <Link href={`/profile/${reviewer._id}`} className="w-10 h-10 rounded-full overflow-hidden bg-secondary border border-border/60 flex-shrink-0">
                      {reviewer.avatar ? (
                        <img src={reviewer.avatar} alt={reviewer.username} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-cyan-500/40 to-cyan-200/20" />
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/profile/${reviewer._id}`} className="font-semibold text-sm leading-tight hover:text-primary transition-colors line-clamp-1">
                        {reviewer.fullName || reviewer.username}
                      </Link>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {formatCount(reviewer.stats?.reviews) == 1 ? "1 review" : `${formatCount(reviewer.stats?.reviews)} reviews`}
                      </p>
                    </div>
                  </article>
                ))}

                {topReviewers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No reviewer stats available right now.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Recent Stories</h2>
        </div>

        <div className="columns-1 md:columns-2 xl:columns-3 gap-3 [column-fill:_balance]">
          {landingNews.map((article, index) => {
            const storyPreview = getStoryPreview(article)
            const previewConfig = getArticlePreviewConfig(article, storyPreview)
            const imageRatio = getArticleImageRatio(article)

            return (
              <article key={`${article.url}-${index}`} className="mb-3 break-inside-avoid rounded-xl border border-border/60 bg-card/70 overflow-hidden shadow-sm hover:shadow-md transition">
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="block">
                  <div
                    className="w-full bg-secondary"
                    style={article.urlToImage ? { aspectRatio: `${imageRatio} / 1` } : { aspectRatio: "16 / 9" }}
                  >
                    {article.urlToImage ? (
                      <img
                        src={article.urlToImage}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-b from-slate-700 to-slate-900" />
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="text-sm font-semibold leading-tight line-clamp-2 hover:text-primary transition-colors">{article.title}</h3>
                    <p
                      className="mt-1.5 text-xs text-muted-foreground whitespace-pre-line leading-relaxed overflow-hidden"
                      style={previewConfig.style}
                    >
                      {previewConfig.text}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-primary">Read Story</p>
                  </div>
                </a>
              </article>
            )
          })}
        </div>

        {landingNews.length === 0 && (
          <p className="text-sm text-muted-foreground">No news stories available right now.</p>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/15 via-primary/5 to-primary/15 px-6 py-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Sign up and write your first review</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Start tracking your watched titles, share your opinion, and discover your next favorite watch through people like you.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Create Your Account
            </Link>
          </div>
        </div>
      </section>

      <style jsx>{`
        .landing-carousel-marquee {
          position: absolute;
          inset: 0 auto 0 0;
          display: flex;
          width: max-content;
          min-width: 100%;
          align-items: center;
          height: 100%;
        }

        .landing-carousel-segment {
          display: flex;
          align-items: flex-end;
          gap: 0.45rem;
          height: 100%;
          padding: 0.2rem 0.45rem;
        }

        .landing-carousel-running {
          animation: landing-carousel-scroll var(--carousel-duration, 24s) linear infinite;
          will-change: transform;
        }

        .landing-carousel-hover:hover .landing-carousel-running {
          animation-play-state: paused;
        }

        @keyframes landing-carousel-scroll {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </main>
  )
}