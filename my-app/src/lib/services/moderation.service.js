/**
 * Adult Content Moderation Service
 * 
 * Provides moderation for text, images, and video content using
 * HuggingFace pretrained models:
 * - Text:  unitary/toxic-bert (toxic/explicit language detection)
 * - Image: Falconsai/nsfw_image_detection (NSFW image classification)
 * - Video: Frame extraction + NSFW image model
 */

const HF_TEXT_MODEL_URL = 'https://router.huggingface.co/hf-inference/models/unitary/toxic-bert'
const HF_IMAGE_MODEL_URL = 'https://router.huggingface.co/hf-inference/models/Falconsai/nsfw_image_detection'

// Thresholds for flagging content
const TEXT_ADULT_THRESHOLD = 0.6
const IMAGE_NSFW_THRESHOLD = 0.6
const VIDEO_NSFW_FRAME_THRESHOLD = 0.6
const VIDEO_NSFW_FRAME_RATIO = 0.3 // If 30%+ of frames are NSFW, flag the video

/**
 * Moderate text content for explicit/adult language using toxic-bert.
 * @param {string} text - The text to analyze
 * @returns {Promise<{isAdult: boolean, score: number, labels: object}>}
 */
export async function moderateText(text) {
  if (!text || text.trim().length === 0) {
    return { isAdult: false, score: 0, labels: {} }
  }

  const apiToken = process.env.HUGGINGFACE_API_TOKEN
  if (!apiToken) {
    console.warn('[Moderation] HUGGINGFACE_API_TOKEN not set, skipping text moderation')
    return { isAdult: false, score: 0, labels: {} }
  }

  try {
    const response = await fetch(HF_TEXT_MODEL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: text })
    })

    if (!response.ok) {
      if (response.status === 503) {
        console.warn('[Moderation] toxic-bert model loading, skipping text moderation')
        return { isAdult: false, score: 0, labels: {}, modelLoading: true }
      }
      console.error('[Moderation] Text moderation API error:', response.status)
      return { isAdult: false, score: 0, labels: {} }
    }

    const raw = await response.json()
    console.log('[Moderation] Text raw response:', JSON.stringify(raw))

    // toxic-bert returns: [[{label, score}, ...]] or [{label, score}, ...]
    let results = raw
    while (Array.isArray(results) && Array.isArray(results[0])) {
      results = results[0]
    }

    if (!Array.isArray(results)) {
      console.error('[Moderation] Unexpected text moderation response format')
      return { isAdult: false, score: 0, labels: {} }
    }

    // Build a label→score map
    const labels = {}
    for (const item of results) {
      if (item.label && typeof item.score === 'number') {
        labels[item.label] = item.score
      }
    }

    // toxic-bert labels: toxic, severe_toxic, obscene, threat, insult, identity_hate
    // For adult content, we focus on "obscene" and "sexual_explicit" (if present)
    // and also check "toxic" as a general indicator
    const obsceneScore = labels['obscene'] || 0
    const toxicScore = labels['toxic'] || 0
    const sexualScore = labels['sexual_explicit'] || 0

    // Use the maximum of relevant scores
    const adultScore = Math.max(obsceneScore, sexualScore)

    return {
      isAdult: adultScore > TEXT_ADULT_THRESHOLD,
      score: adultScore,
      labels
    }
  } catch (error) {
    console.error('[Moderation] Text moderation error:', error)
    return { isAdult: false, score: 0, labels: {} }
  }
}

/**
 * Moderate a single image for NSFW content using Falconsai/nsfw_image_detection.
 * @param {string} imageUrl - URL of the image to analyze (Cloudinary URL)
 * @returns {Promise<{isNSFW: boolean, score: number, labels: object}>}
 */
export async function moderateImage(imageUrl) {
  if (!imageUrl) {
    return { isNSFW: false, score: 0, labels: {} }
  }

  const apiToken = process.env.HUGGINGFACE_API_TOKEN
  if (!apiToken) {
    console.warn('[Moderation] HUGGINGFACE_API_TOKEN not set, skipping image moderation')
    return { isNSFW: false, score: 0, labels: {} }
  }

  try {
    // Fetch the image as binary
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      console.error('[Moderation] Failed to fetch image:', imageUrl)
      return { isNSFW: false, score: 0, labels: {} }
    }
    const imageBuffer = await imageResponse.arrayBuffer()

    // Send binary image to HuggingFace
    const response = await fetch(HF_IMAGE_MODEL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/octet-stream'
      },
      body: imageBuffer
    })

    if (!response.ok) {
      if (response.status === 503) {
        console.warn('[Moderation] NSFW image model loading, skipping image moderation')
        return { isNSFW: false, score: 0, labels: {}, modelLoading: true }
      }
      console.error('[Moderation] Image moderation API error:', response.status)
      return { isNSFW: false, score: 0, labels: {} }
    }

    const raw = await response.json()
    console.log('[Moderation] Image raw response:', JSON.stringify(raw))

    // Falconsai returns: [{label: "nsfw", score: 0.95}, {label: "normal", score: 0.05}]
    // or [[{label, score}, ...]]
    let results = raw
    while (Array.isArray(results) && Array.isArray(results[0])) {
      results = results[0]
    }

    if (!Array.isArray(results)) {
      console.error('[Moderation] Unexpected image moderation response format')
      return { isNSFW: false, score: 0, labels: {} }
    }

    const labels = {}
    for (const item of results) {
      if (item.label && typeof item.score === 'number') {
        labels[item.label] = item.score
      }
    }

    const nsfwScore = labels['nsfw'] || 0

    return {
      isNSFW: nsfwScore > IMAGE_NSFW_THRESHOLD,
      score: nsfwScore,
      labels
    }
  } catch (error) {
    console.error('[Moderation] Image moderation error:', error)
    return { isNSFW: false, score: 0, labels: {} }
  }
}

/**
 * Moderate multiple images and return combined result.
 * @param {string[]} imageUrls - Array of image URLs
 * @returns {Promise<{isNSFW: boolean, maxScore: number, results: Array}>}
 */
export async function moderateImages(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    return { isNSFW: false, maxScore: 0, results: [] }
  }

  const results = await Promise.all(imageUrls.map(url => moderateImage(url)))
  const maxScore = Math.max(...results.map(r => r.score))
  const isNSFW = results.some(r => r.isNSFW)

  return { isNSFW, maxScore, results }
}

/**
 * Moderate a video by extracting frames and running them through image moderation.
 * Uses Cloudinary video URL to extract frame thumbnails at 1-second intervals.
 * @param {string} videoUrl - Cloudinary video URL
 * @returns {Promise<{isNSFW: boolean, maxScore: number, nsfwFrameCount: number, totalFrames: number}>}
 */
export async function moderateVideo(videoUrl) {
  if (!videoUrl) {
    return { isNSFW: false, maxScore: 0, nsfwFrameCount: 0, totalFrames: 0 }
  }

  try {
    // Use Cloudinary's on-the-fly video-to-image transformation to extract frames
    // Cloudinary URL format: .../video/upload/[transformations]/public_id.ext
    // We can get a frame at a specific time offset using so_X (seconds offset)
    // and change format to jpg
    const frameUrls = []
    const maxFrames = 10 // Sample up to 10 frames for performance

    for (let i = 0; i < maxFrames; i++) {
      // Generate frame URL using Cloudinary transformations
      // Replace /video/upload/ with /video/upload/so_Xs,f_jpg/
      const frameUrl = videoUrl.replace(
        '/video/upload/',
        `/video/upload/so_${i * 2},f_jpg,w_640,h_360,c_limit/`
      ).replace(/\.\w+$/, '.jpg')
      frameUrls.push(frameUrl)
    }

    // Moderate each frame (limit concurrency to avoid rate limiting)
    const results = []
    for (const frameUrl of frameUrls) {
      try {
        const result = await moderateImage(frameUrl)
        results.push(result)
      } catch {
        // Frame might not exist (video shorter than expected), skip
        break
      }
    }

    if (results.length === 0) {
      return { isNSFW: false, maxScore: 0, nsfwFrameCount: 0, totalFrames: 0 }
    }

    const nsfwFrameCount = results.filter(r => r.isNSFW).length
    const maxScore = Math.max(...results.map(r => r.score))
    const nsfwRatio = nsfwFrameCount / results.length

    return {
      isNSFW: nsfwRatio >= VIDEO_NSFW_FRAME_RATIO || maxScore > 0.9,
      maxScore,
      nsfwFrameCount,
      totalFrames: results.length
    }
  } catch (error) {
    console.error('[Moderation] Video moderation error:', error)
    return { isNSFW: false, maxScore: 0, nsfwFrameCount: 0, totalFrames: 0 }
  }
}

/**
 * Moderate multiple videos.
 * @param {string[]} videoUrls - Array of video URLs
 * @returns {Promise<{isNSFW: boolean, maxScore: number, results: Array}>}
 */
export async function moderateVideos(videoUrls) {
  if (!videoUrls || videoUrls.length === 0) {
    return { isNSFW: false, maxScore: 0, results: [] }
  }

  const results = []
  // Process videos sequentially to avoid rate limiting
  for (const url of videoUrls) {
    const result = await moderateVideo(url)
    results.push(result)
  }

  const maxScore = Math.max(...results.map(r => r.maxScore))
  const isNSFW = results.some(r => r.isNSFW)

  return { isNSFW, maxScore, results }
}

/**
 * Run the full moderation pipeline on a piece of content.
 * Checks text, images, and videos in parallel where possible.
 * 
 * @param {object} params
 * @param {string} [params.text] - Text content to moderate
 * @param {string[]} [params.imageUrls] - Array of image URLs to moderate  
 * @param {string[]} [params.videoUrls] - Array of video URLs to moderate
 * @returns {Promise<{adult_content: boolean, moderation: object}>}
 */
export async function runModerationPipeline({ text, imageUrls, videoUrls }) {
  // Run text and image moderation in parallel, videos sequentially after
  const [textResult, imageResult] = await Promise.all([
    text ? moderateText(text) : Promise.resolve(null),
    imageUrls?.length ? moderateImages(imageUrls) : Promise.resolve(null)
  ])

  // Video moderation (sequential due to frame extraction)
  const videoResult = videoUrls?.length ? await moderateVideos(videoUrls) : null

  // Determine overall adult content flag
  const isAdultText = textResult?.isAdult || false
  const isAdultImage = imageResult?.isNSFW || false
  const isAdultVideo = videoResult?.isNSFW || false
  const isAdultContent = isAdultText || isAdultImage || isAdultVideo

  // Determine primary moderation type
  let moderationType = null
  let highestScore = 0

  if (textResult && textResult.score > highestScore) {
    highestScore = textResult.score
    moderationType = 'text'
  }
  if (imageResult && imageResult.maxScore > highestScore) {
    highestScore = imageResult.maxScore
    moderationType = 'image'
  }
  if (videoResult && videoResult.maxScore > highestScore) {
    highestScore = videoResult.maxScore
    moderationType = 'video'
  }

  const moderation = {
    text_score: textResult?.score || 0,
    text_labels: textResult?.labels || {},
    image_score: imageResult?.maxScore || 0,
    video_score: videoResult?.maxScore || 0,
    video_nsfw_frames: videoResult?.nsfwFrameCount || 0,
    video_total_frames: videoResult?.totalFrames || 0,
    moderation_type: moderationType,
    confidence: highestScore
  }

  return {
    adult_content: isAdultContent,
    moderation
  }
}

/**
 * Check if a user is 18 or older based on their date of birth.
 * @param {Date|string} dateOfBirth - User's date of birth
 * @returns {boolean} true if user is 18+
 */
export function isUserAdult(dateOfBirth) {
  if (!dateOfBirth) return false // If no DOB, treat as minor for safety
  
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  
  return age >= 18
}
