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

const reviewSchema = new mongoose.Schema({
  // Movie/TV Show Information
  mediaId: {
    type: String,
    required: [true, 'Media ID is required'],
    index: true
  },
  mediaType: {
    type: String,
    enum: ['movie', 'tv'],
    required: [true, 'Media type is required']
  },
  mediaTitle: {
    type: String,
    required: true
  },
  
  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Review Content
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [0, 'Rating must be at least 0'],
    max: [10, 'Rating cannot exceed 10']
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    maxlength: [500, 'Title cannot exceed 500 characters']
  },
  content: {
    type: String,
    required: [true, 'Review content is required'],
    minlength: [10, 'Review must be at least 10 characters'],
    maxlength: [5000, 'Review cannot exceed 5000 characters']
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
  
  // Replies (Reddit-style nested comments)
  replies: [replySchema],
  
  // Metadata
  spoiler: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  
  // Embedding for RAG vector search
  embedding: {
    type: [Number],
    select: false
  },

  // Moderation
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String
  },
  isRemoved: {
    type: Boolean,
    default: false
  },
  removalReason: {
    type: String
  },
  moderatedAt: {
    type: Date
  },
  moderatedBy: {
    type: String // 'AI_BOT' or admin user ID
  },
  flagCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
reviewSchema.index({ mediaId: 1, mediaType: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ 'likes': 1 });

// Virtual for like count
reviewSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for dislike count
reviewSchema.virtual('dislikeCount').get(function() {
  return this.dislikes.length;
});

// Virtual for reply count
reviewSchema.virtual('replyCount').get(function() {
  return this.replies.length;
});

// Method to add a reply
reviewSchema.methods.addReply = function(userId, content, spoiler = false) {
  this.replies.push({
    user: userId,
    content: content,
    spoiler: spoiler
  });
  return this.save();
};

// Method to like a review
reviewSchema.methods.likeReview = function(userId) {
  // Remove from dislikes if present
  this.dislikes = this.dislikes.filter(id => !id.equals(userId));
  
  // Toggle like
  const likeIndex = this.likes.findIndex(id => id.equals(userId));
  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
  } else {
    this.likes.push(userId);
  }
  
  return this.save();
};

// Method to dislike a review
reviewSchema.methods.dislikeReview = function(userId) {
  // Remove from likes if present
  this.likes = this.likes.filter(id => !id.equals(userId));
  
  // Toggle dislike
  const dislikeIndex = this.dislikes.findIndex(id => id.equals(userId));
  if (dislikeIndex > -1) {
    this.dislikes.splice(dislikeIndex, 1);
  } else {
    this.dislikes.push(userId);
  }
  
  return this.save();
};

// Method to like a reply
reviewSchema.methods.likeReply = function(replyId, userId) {
  const reply = this.replies.id(replyId);
  if (!reply) {
    throw new Error('Reply not found');
  }
  
  // Remove from dislikes if present
  reply.dislikes = reply.dislikes.filter(id => !id.equals(userId));
  
  // Toggle like
  const likeIndex = reply.likes.findIndex(id => id.equals(userId));
  if (likeIndex > -1) {
    reply.likes.splice(likeIndex, 1);
  } else {
    reply.likes.push(userId);
  }
  
  return this.save();
};

// Method to dislike a reply
reviewSchema.methods.dislikeReply = function(replyId, userId) {
  const reply = this.replies.id(replyId);
  if (!reply) {
    throw new Error('Reply not found');
  }
  
  // Remove from likes if present
  reply.likes = reply.likes.filter(id => !id.equals(userId));
  
  // Toggle dislike
  const dislikeIndex = reply.dislikes.findIndex(id => id.equals(userId));
  if (dislikeIndex > -1) {
    reply.dislikes.splice(dislikeIndex, 1);
  } else {
    reply.dislikes.push(userId);
  }
  
  return this.save();
};

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;