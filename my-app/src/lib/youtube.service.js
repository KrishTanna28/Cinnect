import { get, set } from '@/lib/utils/cache.js'

const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
const BASE_URL = 'https://www.googleapis.com/youtube/v3'

export async function searchVideos(query, pageToken = null) {
  if (!API_KEY || API_KEY === 'demo') {
    console.log('[WARN] YouTube API key not configured')
    return { items: [], nextPageToken: null }
  }

  const cacheKey = `youtube:search:${query}:${pageToken || 'first'}`
  const cached = await get(cacheKey)
  if (cached) {
    console.log('[OK] YouTube cache hit:', cacheKey)
    return cached
  }

  try {
    const searchQuery = `${query}`
    let url = `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=12&order=relevance&videoDuration=medium&key=${API_KEY}`

    if (pageToken) {
      url += `&pageToken=${pageToken}`
    }

    console.log('[FETCH] Fetching from YouTube API...')
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()

    const result = {
      items: (data.items || []).map(item => ({
        id: item.id.videoId,
        key: item.id.videoId,
        name: item.snippet.title,
        type: 'Featured',
        site: 'YouTube',
        official: false,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url
      })),
      nextPageToken: data.nextPageToken || null
    }

    await set(cacheKey, result, 3600)
    console.log('[OK] YouTube data cached:', cacheKey)

    return result
  } catch (error) {
    console.error('[ERROR] YouTube API error:', error)
    return { items: [], nextPageToken: null }
  }
}

// Named export `searchVideos` is provided above
