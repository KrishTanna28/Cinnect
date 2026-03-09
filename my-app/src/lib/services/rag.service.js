import { generateEmbedding } from "@/lib/services/embedding.service";
import connectDB from "@/lib/config/database";
import Review from "@/lib/models/Review";
import Post from "@/lib/models/Post";

/**
 * Perform vector search on a collection using MongoDB Atlas $vectorSearch.
 * Requires an Atlas Vector Search index on the `embedding` field.
 *
 * @param {import('mongoose').Model} model - Mongoose model to search.
 * @param {number[]} queryVector - The embedding vector for the query.
 * @param {object} options
 * @param {number} [options.limit=5] - Max results to return.
 * @param {string} [options.indexName='embedding_index'] - Atlas vector search index name.
 * @param {string} [options.embeddingField='embedding'] - Field storing the embedding.
 * @returns {Promise<object[]>} Matching documents with search score.
 */
async function vectorSearch(model, queryVector, options = {}) {
  const {
    limit = 5,
    indexName = "embedding_index",
    embeddingField = "embedding",
  } = options;

  const pipeline = [
    {
      $vectorSearch: {
        index: indexName,
        path: embeddingField,
        queryVector,
        numCandidates: limit * 10,
        limit,
      },
    },
    {
      $addFields: {
        searchScore: { $meta: "vectorSearchScore" },
      },
    },
  ];

  return model.aggregate(pipeline);
}

/**
 * Search reviews relevant to a user query using vector similarity.
 * @param {string} query - The user's question.
 * @param {number} [limit=5] - Max results.
 * @returns {Promise<object[]>} Relevant reviews.
 */
export async function searchReviews(query, limit = 5) {
  await connectDB();
  const queryVector = await generateEmbedding(query);

  const results = await vectorSearch(Review, queryVector, {
    limit,
    indexName: "review_embedding_index",
  });

  return results.map((r) => ({
    mediaTitle: r.mediaTitle,
    mediaType: r.mediaType,
    rating: r.rating,
    title: r.title,
    content: r.content,
    likeCount: r.likes?.length || 0,
    searchScore: r.searchScore,
  }));
}

/**
 * Search community posts relevant to a user query using vector similarity.
 * @param {string} query - The user's question.
 * @param {number} [limit=5] - Max results.
 * @returns {Promise<object[]>} Relevant posts.
 */
export async function searchPosts(query, limit = 5) {
  await connectDB();
  const queryVector = await generateEmbedding(query);

  const results = await vectorSearch(Post, queryVector, {
    limit,
    indexName: "post_embedding_index",
  });

  return results.map((p) => ({
    title: p.title,
    content: p.content,
    likeCount: p.likes?.length || 0,
    commentCount: p.comments?.length || 0,
    views: p.views || 0,
    searchScore: p.searchScore,
  }));
}

/**
 * Retrieve RAG context from both reviews and posts for a user query.
 * @param {string} query - The user's question.
 * @returns {Promise<string>} Formatted context string for the LLM.
 */
export async function retrieveRAGContext(query) {
  const [reviews, posts] = await Promise.all([
    searchReviews(query, 5).catch(() => []),
    searchPosts(query, 5).catch(() => []),
  ]);

  let context = "";

  if (reviews.length > 0) {
    context += "\n--- USER REVIEWS FROM CINEHUB ---\n";
    reviews.forEach((r, i) => {
      context += `\n${i + 1}. Review for "${r.mediaTitle}" (${r.mediaType}) — Rating: ${r.rating}/10\n`;
      context += `   Title: ${r.title}\n`;
      context += `   "${r.content.slice(0, 300)}${r.content.length > 300 ? "..." : ""}"\n`;
      context += `   Likes: ${r.likeCount}\n`;
    });
  }

  if (posts.length > 0) {
    context += "\n--- COMMUNITY DISCUSSIONS FROM CINEHUB ---\n";
    posts.forEach((p, i) => {
      context += `\n${i + 1}. "${p.title}"\n`;
      context += `   "${(p.content || "").slice(0, 300)}${(p.content || "").length > 300 ? "..." : ""}"\n`;
      context += `   Likes: ${p.likeCount} · Comments: ${p.commentCount} · Views: ${p.views}\n`;
    });
  }

  return context;
}
