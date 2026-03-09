import { get, set } from '@/lib/utils/cache.js'

const API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY
const BASE_URL = 'https://newsapi.org/v2'

export async function searchNews(query, page = 1) {
  if (!API_KEY || API_KEY === 'demo') {
    console.log('[WARN] News API key not configured')
    return { articles: [], hasMore: false }
  }

  const cacheKey = `news:search:${query}:${page}`
  const cached = await get(cacheKey)
  if (cached) {
    console.log('[OK] News cache hit:', cacheKey)
    return cached
  }

  try {
    const entertainmentKeywords = 'movie OR film OR cinema OR trailer OR review OR cast OR streaming OR premiere'
    const url = `${BASE_URL}/everything?qInTitle=${encodeURIComponent('"' + query + '"')}&q=${encodeURIComponent(entertainmentKeywords)}&sortBy=relevancy&pageSize=20&page=${page}&language=en&apiKey=${API_KEY}`

    console.log('[FETCH] Fetching from NewsAPI...')
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'ok') {
      throw new Error(data.message || 'NewsAPI request failed')
    }

    const filteredArticles = (data.articles || []).filter(article => {
      const queryLower = query.toLowerCase()
      const articleTitle = (article.title || '').toLowerCase()
      const articleDesc = (article.description || '').toLowerCase()
      const articleContent = (article.content || '').toLowerCase()

      return articleTitle.includes(queryLower) || 
             articleDesc.includes(queryLower) || 
             articleContent.includes(queryLower)
    })

    const result = {
      articles: filteredArticles,
      hasMore: filteredArticles.length > 0 && data.articles.length === 20
    }

    await set(cacheKey, result, 7200)
    console.log('[OK] News data cached:', cacheKey, `(${filteredArticles.length} articles)`)

    return result
  } catch (error) {
    console.error('[ERROR] NewsAPI error:', error)
    return { articles: [], hasMore: false }
  }
}

// Named export `searchNews` is provided above
