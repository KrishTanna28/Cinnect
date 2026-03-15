import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Track if conversation is in "Requests" section
  isRequest: {
    type: Boolean,
    default: false
  },
  // Track which user sees this as a request
  requestFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Track unread count per user
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient participant queries
conversationSchema.index({ participants: 1, lastMessageAt: -1 });
conversationSchema.index({ requestFor: 1, isRequest: 1 });

// Method to check if user follows another user
conversationSchema.methods.shouldBeRequest = async function(senderId, recipientId) {
  const User = mongoose.model('User');
  const recipient = await User.findById(recipientId);
  
  if (!recipient) return false;
  
  // Check if sender follows recipient
  const isFollowing = recipient.followers?.some(
    follower => follower.toString() === senderId.toString()
  );
  
  return !isFollowing;
};

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

export default Conversation;
