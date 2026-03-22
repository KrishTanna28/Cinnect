import User from '../models/User';

/**
 * Extract @mentions from text content
 * @param {string} content - Reply text
 * @returns {string[]} - Array of usernames mentioned
 */
export function extractMentions(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const regex = /@(\w+)/g;
  const matches = [...content.matchAll(regex)];
  const usernames = matches.map(m => m[1]);
  return [...new Set(usernames)]; // Deduplicate
}

/**
 * Validate mentions and return user data
 * @param {string} content - Reply text
 * @returns {Promise<Array<{userId: ObjectId, username: string}>>}
 */
export async function extractAndValidateMentions(content) {
  const usernames = extractMentions(content);

  if (usernames.length === 0) {
    return [];
  }

  // Look up users in database
  const users = await User.find({
    username: { $in: usernames }
  }).select('_id username').lean();

  return users.map(u => ({
    userId: u._id,
    username: u.username
  }));
}

/**
 * Highlight @mentions in HTML (for frontend rendering)
 * @param {string} content - Reply text
 * @returns {string} - HTML with highlighted mentions
 */
export function highlightMentions(content) {
  if (!content || typeof content !== 'string') {
    return content || '';
  }

  return content.replace(
    /@(\w+)/g,
    '<span class="mention">@$1</span>'
  );
}
