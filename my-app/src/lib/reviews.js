const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

export async function getReviews(mediaType, mediaId, page = 1, limit = 10, sortBy = 'recent') {
  try {
    const response = await fetch(
      `${API_BASE_URL}/reviews?mediaType=${mediaType}&mediaId=${mediaId}&page=${page}&limit=${limit}&sortBy=${sortBy}`
    )
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Get reviews error:', error)
    throw error
  }
}

export async function getReviewById(reviewId) {
  try {
    const response = await fetch(`${API_BASE_URL}/reviews/review/${reviewId}`)
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Get review error:', error)
    throw error
  }
}

export async function createReview(reviewData) {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Please login to create a review')
    }

    const response = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reviewData)
    })
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create review')
    }
    
    return data
  } catch (error) {
    console.error('Create review error:', error)
    throw error
  }
}

export async function updateReview(reviewId, reviewData) {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Please login to update a review')
    }

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reviewData)
    })
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update review')
    }
    
    return data
  } catch (error) {
    console.error('Update review error:', error)
    throw error
  }
}

export async function deleteReview(reviewId) {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Please login to delete a review')
    }

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete review')
    }
    
    return data
  } catch (error) {
    console.error('Delete review error:', error)
    throw error
  }
}

export async function likeReview(reviewId) {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Please login to like a review')
    }

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to like review')
    }
    
    return data
  } catch (error) {
    console.error('Like review error:', error)
    throw error
  }
}

export async function dislikeReview(reviewId) {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Please login to dislike a review')
    }

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/dislike`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to dislike review')
    }
    
    return data
  } catch (error) {
    console.error('Dislike review error:', error)
    throw error
  }
}

export async function addReply(reviewId, content, spoiler = false) {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Please login to add a reply')
    }

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content, spoiler })
    })
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to add reply')
    }
    
    return data
  } catch (error) {
    console.error('Add reply error:', error)
    throw error
  }
}

export async function likeReply(reviewId, replyId) {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Please login to like a reply')
    }

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/reply/${replyId}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to like reply')
    }
    
    return data
  } catch (error) {
    console.error('Like reply error:', error)
    throw error
  }
}

export async function dislikeReply(reviewId, replyId) {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Please login to dislike a reply')
    }

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/reply/${replyId}/dislike`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to dislike reply')
    }
    
    return data
  } catch (error) {
    console.error('Dislike reply error:', error)
    throw error
  }
}

export async function getUserReviews(page = 1, limit = 10) {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('Please login to view your reviews')
    }

    const response = await fetch(
      `${API_BASE_URL}/reviews/user/my-reviews?page=${page}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Get user reviews error:', error)
    throw error
  }
}
