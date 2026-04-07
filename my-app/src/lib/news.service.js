import { get, set } from '@/lib/utils/cache.js'

const API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY
const BASE_URL = 'https://newsapi.org/v2'

const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
}

function decodeHtmlEntities(value = '') {
  return value
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([\da-fA-F]+);/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp|#39);/g, (entity) => HTML_ENTITY_MAP[entity] || entity)
}

function sanitizeNewsText(value = '') {
  if (!value) return ''

  const withoutTags = value.replace(/<[^>]*>/g, ' ')
  const decoded = decodeHtmlEntities(withoutTags)
  return decoded.replace(/\s+/g, ' ').trim()
}

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

    const normalizedArticles = (data.articles || [])
      .filter(article => article?.url)
      .map(article => ({
        ...article,
        title: sanitizeNewsText(article.title || ''),
        description: sanitizeNewsText(article.description || ''),
        content: sanitizeNewsText(article.content || ''),
        source: article?.source
          ? { ...article.source, name: sanitizeNewsText(article.source.name || '') }
          : article.source,
      }))
      .filter(article => article.title)

    const strictMatches = normalizedArticles.filter(article => {
      const queryLower = query.toLowerCase()
      const articleTitle = (article.title || '').toLowerCase()
      const articleDesc = (article.description || '').toLowerCase()
      const articleContent = (article.content || '').toLowerCase()

      return articleTitle.includes(queryLower) || 
             articleDesc.includes(queryLower) || 
             articleContent.includes(queryLower)
    })

    const filteredArticles = strictMatches.length >= 8 ? strictMatches : normalizedArticles

    const result = {
      articles: filteredArticles,
      hasMore: Number(data.totalResults || 0) > page * 20
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