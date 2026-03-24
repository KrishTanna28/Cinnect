/**
 * API Client for frontend
 * Handles authentication, error handling, and provides consistent responses
 */

// User-friendly error messages for common scenarios
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  TIMEOUT: 'Request timed out. Please try again.',
}

/**
 * Get the auth token from localStorage
 */
function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

/**
 * Handle 401 Unauthorized responses
 * Clears auth state and redirects to login
 */
function handleUnauthorized(returnUrl = null) {
  if (typeof window === 'undefined') return

  // Clear auth data
  localStorage.removeItem('token')
  localStorage.removeItem('user')

  // Build login URL with return path
  const loginUrl = returnUrl
    ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
    : '/login'

  // Redirect to login
  window.location.href = loginUrl
}

/**
 * Parse API response and handle errors
 */
async function parseResponse(response, options = {}) {
  const contentType = response.headers.get('content-type')
  const isJson = contentType && contentType.includes('application/json')

  // Parse response body
  let data
  try {
    data = isJson ? await response.json() : await response.text()
  } catch (e) {
    data = null
  }

  // Handle success
  if (response.ok) {
    return {
      success: true,
      data: isJson && data?.data !== undefined ? data.data : data,
      message: data?.message,
      status: response.status,
    }
  }

  // Handle specific error statuses
  const errorMessage = data?.message || getErrorMessage(response.status)

  // Handle 401 Unauthorized
  if (response.status === 401 && !options.skipAuthRedirect) {
    handleUnauthorized(options.returnUrl || (typeof window !== 'undefined' ? window.location.pathname : null))
    return {
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      status: 401,
      shouldRedirect: true,
    }
  }

  return {
    success: false,
    error: errorMessage,
    status: response.status,
    data: data,
  }
}

/**
 * Get user-friendly error message based on status code
 */
function getErrorMessage(status) {
  switch (status) {
    case 400:
      return ERROR_MESSAGES.VALIDATION_ERROR
    case 401:
      return ERROR_MESSAGES.UNAUTHORIZED
    case 403:
      return ERROR_MESSAGES.FORBIDDEN
    case 404:
      return ERROR_MESSAGES.NOT_FOUND
    case 429:
      return ERROR_MESSAGES.RATE_LIMITED
    case 500:
    case 502:
    case 503:
    case 504:
      return ERROR_MESSAGES.SERVER_ERROR
    default:
      return ERROR_MESSAGES.SERVER_ERROR
  }
}

/**
 * Main API fetch function
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @param {object} apiOptions - Additional API options
 */
export async function api(url, options = {}, apiOptions = {}) {
  const token = getToken()

  // Build headers
  const headers = {
    ...(options.body && !(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  }

  // Build fetch options
  const fetchOptions = {
    ...options,
    headers,
    body: options.body && !(options.body instanceof FormData)
      ? JSON.stringify(options.body)
      : options.body,
  }

  try {
    const response = await fetch(url, fetchOptions)
    return parseResponse(response, apiOptions)
  } catch (error) {
    // Network error or timeout
    console.error('API request failed:', error)

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: ERROR_MESSAGES.TIMEOUT,
        status: 0,
      }
    }

    return {
      success: false,
      error: ERROR_MESSAGES.NETWORK_ERROR,
      status: 0,
    }
  }
}

/**
 * Convenience methods for common HTTP methods
 */
export const apiClient = {
  get: (url, options = {}, apiOptions = {}) =>
    api(url, { ...options, method: 'GET' }, apiOptions),

  post: (url, body, options = {}, apiOptions = {}) =>
    api(url, { ...options, method: 'POST', body }, apiOptions),

  put: (url, body, options = {}, apiOptions = {}) =>
    api(url, { ...options, method: 'PUT', body }, apiOptions),

  patch: (url, body, options = {}, apiOptions = {}) =>
    api(url, { ...options, method: 'PATCH', body }, apiOptions),

  delete: (url, options = {}, apiOptions = {}) =>
    api(url, { ...options, method: 'DELETE' }, apiOptions),
}

/**
 * Fetch with automatic retry for transient failures
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @param {number} retries - Number of retries (default: 2)
 */
export async function apiWithRetry(url, options = {}, retries = 2) {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await api(url, options)

    // Success or client error (4xx) - don't retry
    if (result.success || (result.status >= 400 && result.status < 500)) {
      return result
    }

    lastError = result

    // Server error (5xx) or network error - maybe retry
    if (attempt < retries) {
      // Exponential backoff: 1s, 2s
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  return lastError
}

/**
 * Check if the user is currently authenticated
 */
export function isAuthenticated() {
  return !!getToken()
}

/**
 * Logout the user
 */
export function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

export default api
