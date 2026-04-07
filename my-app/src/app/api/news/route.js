import { NextResponse } from 'next/server'
import { searchNews } from '@/lib/news.service.js'

function uniqueByUrl(articles = []) {
  const seen = new Set()
  return articles.filter((article) => {
    const url = article?.url
    if (!url || seen.has(url)) return false
    seen.add(url)
    return true
  })
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawQuery = (searchParams.get('q') || 'movie').trim()
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)

    const fallbackQueries = rawQuery.toLowerCase() === 'movie'
      ? ['movie', 'tv show', 'streaming']
      : [rawQuery, 'movie', 'tv show']

    let mergedArticles = []

    for (const query of fallbackQueries) {
      for (const currentPage of [page, page + 1]) {
        const result = await searchNews(query, currentPage)
        mergedArticles = mergedArticles.concat(result?.articles || [])
        if (uniqueByUrl(mergedArticles).length >= 20) break
      }

      if (uniqueByUrl(mergedArticles).length >= 20) break
    }

    const articles = uniqueByUrl(mergedArticles).slice(0, 20)

    return NextResponse.json({
      success: true,
      data: {
        articles,
        hasMore: articles.length >= 20,
      },
    })
  } catch (error) {
    console.error('News API route error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch news',
      },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
