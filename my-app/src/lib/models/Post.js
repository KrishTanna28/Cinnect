import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Reply content is required'],
    minlength: [1, 'Reply must be at least 1 character'],
    maxlength: [1000, 'Reply cannot exceed 1000 characters']
  },
  spoiler: {
    type: Boolean,
    default: false
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    minlength: [1, 'Comment must be at least 1 character'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  spoiler: {
    type: Boolean,
    default: false
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [replySchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const postSchema = new mongoose.Schema({
  // Community Reference
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
    index: true
  },
  
  // Post Content
  title: {
    type: String,
    required: [true, 'Post title is required'],
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [500, 'Title cannot exceed 300 characters'],
    trim: true
  },
  content: {
    type: String,
    maxlength: [10000, 'Content cannot exceed 10000 characters']
  },
  
  // Images
  images: [{
    type: String
  }],
  
  // Videos
  videos: [{
    type: String
  }],
  
  // Author
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Engagement
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  
  // Comments
  comments: [commentSchema],
  
  // Embedding for RAG vector search
  embedding: {
    type: [Number],
    select: false
  },

  // Spoiler flag
  spoiler: {
    type: Boolean,
    default: false
  },

  // Metadata
  isPinned: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String
  },
  
  // Moderation
  isApproved: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ title: 'text', content: 'text' });

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

// Virtual for like count
postSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for dislike count
postSchema.virtual('dislikeCount').get(function() {
  return this.dislikes.length;
});

// Virtual for score
postSchema.virtual('score').get(function() {
  return this.likes.length - this.dislikes.length;
});

// Methods
postSchema.methods.addComment = function(userId, content, spoiler = false) {
  this.comments.push({ user: userId, content, spoiler });
  return this.save();
};

postSchema.methods.likeComment = function(commentId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  const userIdStr = userId?.toString();
  const dislikeIndex = comment.dislikes.findIndex(id => id?.toString() === userIdStr);
  const likeIndex = comment.likes.findIndex(id => id?.toString() === userIdStr);
  
  // Remove from dislikes if present
  if (dislikeIndex > -1) {
    comment.dislikes.splice(dislikeIndex, 1);
  }
  
  // Toggle like
  if (likeIndex > -1) {
    comment.likes.splice(likeIndex, 1);
  } else {
    comment.likes.push(userId);
  }
  
  return this.save();
};

postSchema.methods.dislikeComment = function(commentId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  const userIdStr = userId?.toString();
  const likeIndex = comment.likes.findIndex(id => id?.toString() === userIdStr);
  const dislikeIndex = comment.dislikes.findIndex(id => id?.toString() === userIdStr);
  
  // Remove from likes if present
  if (likeIndex > -1) {
    comment.likes.splice(likeIndex, 1);
  }
  
  // Toggle dislike
  if (dislikeIndex > -1) {
    comment.dislikes.splice(dislikeIndex, 1);
  } else {
    comment.dislikes.push(userId);
  }
  
  return this.save();
};

postSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

postSchema.methods.addReply = function(commentId, userId, content, spoiler = false) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  comment.replies.push({ user: userId, content, spoiler });
  return this.save();
};

postSchema.methods.likeReply = function(commentId, replyId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  const reply = comment.replies.id(replyId);
  if (!reply) throw new Error('Reply not found');
  
  const userIdStr = userId?.toString();
  const dislikeIndex = reply.dislikes.findIndex(id => id?.toString() === userIdStr);
  const likeIndex = reply.likes.findIndex(id => id?.toString() === userIdStr);
  
  // Remove from dislikes if present
  if (dislikeIndex > -1) {
    reply.dislikes.splice(dislikeIndex, 1);
  }
  
  // Toggle like
  if (likeIndex > -1) {
    reply.likes.splice(likeIndex, 1);
  } else {
    reply.likes.push(userId);
  }
  
  return this.save();
};

postSchema.methods.dislikeReply = function(commentId, replyId, userId) {
  const comment = this.comments.id(commentId);
  if (!comment) throw new Error('Comment not found');
  
  const reply = comment.replies.id(replyId);
  if (!reply) throw new Error('Reply not found');
  
  const userIdStr = userId?.toString();
  const likeIndex = reply.likes.findIndex(id => id?.toString() === userIdStr);
  const dislikeIndex = reply.dislikes.findIndex(id => id?.toString() === userIdStr);
  
  // Remove from likes if present
  if (likeIndex > -1) {
    reply.likes.splice(likeIndex, 1);
  }
  
  // Toggle dislike
  if (dislikeIndex > -1) {
    reply.dislikes.splice(dislikeIndex, 1);
  } else {
    reply.dislikes.push(userId);
  }
  
  return this.save();
};

const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

export default Post;
