    import mongoose from 'mongoose';

const communitySchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Community name is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Category - Only entertainment related
  category: {
    type: String,
    enum: ['general', 'movie', 'tv', 'actor', 'mixed'],
    default: 'general',
    index: true
  },
  
  // Related Entity (optional - for movie/TV/actor specific communities)
  relatedEntityId: {
    type: String,
    index: true
  },
  relatedEntityName: {
    type: String
  },
  relatedEntityType: {
    type: String,
    enum: ['movie', 'tv', 'actor']
  },
  
  // Images
  banner: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  
  // Creator & Moderation
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Members
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Pending Join Requests (for private communities)
  pendingRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Community Stats
  memberCount: {
    type: Number,
    default: 1
  },
  postCount: {
    type: Number,
    default: 0
  },
  
  // Settings
  isPrivate: {
    type: Boolean,
    default: false
  },
  requireApproval: {
    type: Boolean,
    default: false
  },
  allowImages: {
    type: Boolean,
    default: true
  },
  allowVideos: {
    type: Boolean,
    default: false
  },
  
  // Rules
  rules: [{
    title: String,
    description: String
  }],
  
  // Adult content flag
  adult_content: {
    type: Boolean,
    default: false
  },

  // Moderation
  isFlagged: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
communitySchema.index({ slug: 1 });
communitySchema.index({ category: 1, memberCount: -1 });
communitySchema.index({ creator: 1, createdAt: -1 });
communitySchema.index({ name: 'text', description: 'text' });

// Generate slug from name
communitySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Methods
communitySchema.methods.addMember = function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.memberCount = this.members.length;
  }
  return this.save();
};

communitySchema.methods.removeMember = function(userId) {
  const index = this.members.indexOf(userId);
  if (index > -1) {
    this.members.splice(index, 1);
    this.memberCount = this.members.length;
  }
  return this.save();
};

communitySchema.methods.isMember = function(userId) {
  return this.members.some(id => id?.toString() === userId?.toString());
};

communitySchema.methods.isModerator = function(userId) {
  return this.moderators.some(id => id?.toString() === userId?.toString()) ||
         this.creator.toString() === userId?.toString();
};

communitySchema.methods.addJoinRequest = function(userId) {
  const exists = this.pendingRequests.some(req => req.user.toString() === userId?.toString());
  if (!exists && !this.isMember(userId)) {
    this.pendingRequests.push({ user: userId });
  }
  return this.save();
};

communitySchema.methods.removeJoinRequest = function(userId) {
  this.pendingRequests = this.pendingRequests.filter(
    req => req.user.toString() !== userId?.toString()
  );
  return this.save();
};

communitySchema.methods.hasJoinRequest = function(userId) {
  return this.pendingRequests.some(req => req.user.toString() === userId?.toString());
};

communitySchema.methods.approveJoinRequest =  async function(userId) {
  this.removeJoinRequest(userId);
  this.addMember(userId);
  return await this.save();
};

const Community = mongoose.models.Community || mongoose.model('Community', communitySchema);

export default Community;
