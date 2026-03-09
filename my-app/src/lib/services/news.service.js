const API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY
const BASE_URL = 'https://newsapi.org/v2'

/**
 * Build a smart, context-aware NewsAPI query
 * @param {string} query
 * @param {'movie' | 'person'} type
 */
function buildSmartNewsQuery(query, type = 'movie') {
  if (type === 'person') {
    return {
      qInTitle: `"${query}"`,
      q: 'actor OR actress OR director OR filmmaker OR hollywood'
    }
  }

  // movie / tv show
  return {
    qInTitle: `"${query}"`,
    q: 'movie OR film OR series OR tv OR streaming OR cinema'
  }
}

/**
 * Fetch news articles ABOUT a movie / TV show / person
 * @param {string} query
 * @param {number} page
 * @param {'movie' | 'person'} type
 * @returns {Promise<Object>}
 */
export async function searchNews(query, page = 1, type = 'movie') {
  if (!API_KEY || API_KEY === 'demo') {
    console.log('[WARN] News API key not configured')
    return { articles: [], hasMore: false }
  }

  try {
    const { q, qInTitle } = buildSmartNewsQuery(query, type)

    const url =
      `${BASE_URL}/everything?` +
      `q=${encodeURIComponent(q)}&` +
      `qInTitle=${encodeURIComponent(qInTitle)}&` +
      `sources=variety,the-hollywood-reporter,deadline-entertainment,entertainment-weekly&` +
      `sortBy=relevancy&pageSize=20&page=${page}&language=en&apiKey=${API_KEY}`

    console.log('[FETCH] Fetching from NewsAPI...')
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'ok') {
      throw new Error(data.message || 'NewsAPI request failed')
    }

    return {
      articles: data.articles || [],
      hasMore: data.articles?.length === 20
    }
  } catch (error) {
    console.error('[ERROR] NewsAPI error:', error)
    return { articles: [], hasMore: false }
  }
}
