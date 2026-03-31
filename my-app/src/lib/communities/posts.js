const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

export async function fetchPosts(paramsId){
    try {
        const headers = {}
        const response = await fetch(`/api/posts/${paramsId}?commentsPage=1&commentsLimit=10`, { headers })
        return response.json()
    }catch (error) {
        console.error('Get posts error:', error)
        throw error
    }
}
