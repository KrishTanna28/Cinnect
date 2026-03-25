import { getMovieReviews, getTVReviews } from '@/lib/services/tmdb.service.js'
import { success, error, handleError } from '@/lib/utils/apiResponse.js'

// GET /api/reviews/tmdb - Get TMDB reviews for a movie/TV show
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('mediaId')
    const mediaType = searchParams.get('mediaType')
    const page = Math.max(parseInt(searchParams.get('page')) || 1, 1)

    if (!mediaId || !mediaType) {
      return error('mediaId and mediaType are required', 400)
    }

    let tmdbData
    if (mediaType === 'tv') {
      tmdbData = await getTVReviews(mediaId, page)
    } else {
      tmdbData = await getMovieReviews(mediaId, page)
    }

    return success({
      reviews: tmdbData.results,
      pagination: {
        total: tmdbData.totalResults,
        page: tmdbData.page,
        pages: tmdbData.totalPages,
        limit: 20
      }
    })
  } catch (err) {
    return handleError(err, 'Get TMDB reviews')
  }
}
