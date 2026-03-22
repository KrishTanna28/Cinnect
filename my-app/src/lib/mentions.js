import User from '@/lib/models/User.js';

/**
 * Extracts and validates @mentions from a text string.
 * Validates extracted usernames against the User database.
 * 
 * @param {string} text - The raw text containing potential @mentions
 * @returns {Promise<{ cleanedText: string, mentionedUsers: Array<{ userId: string, username: string }> }>}
 */
export async function processMentions(text) {
  if (!text || typeof text !== 'string') {
    return {
      cleanedText: text || '',
      mentionedUsers: []
    };
  }

  const mentionedUsers = [];
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  
  // Extract all mentions without the '@' symbol
  const mentions = [...text.matchAll(mentionRegex)].map(m => m[1]);
  const uniqueMentions = [...new Set(mentions)];

  let cleanedText = text;

  if (uniqueMentions.length > 0) {
    // Validate usernames against the database
    const validUsers = await User.find({ username: { $in: uniqueMentions } })
      .select('_id username')
      .lean();

    const validUsernamesList = validUsers.map(u => u.username);

    // Populate validated user IDs and usernames
    validUsers.forEach(user => {
      mentionedUsers.push({
        userId: user._id,
        username: user.username
      });
    });

    // Cleaned text processing: 
    // Here we can choose to handle invalid mentions. 
    // For now, we return the text as is, assuming the frontend 
    // uses `mentionedUsers` to selectively link valid ones.
    // If you need to strip invalid mentions, you could do it here.
  }

  return {
    cleanedText,
    mentionedUsers
  };
}
