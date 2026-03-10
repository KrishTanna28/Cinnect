import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Who receives this notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Notification type
  type: {
    type: String,
    enum: [
      'follow_request', 'community_join_request', 'ai_generated',
      'new_follower', 'lost_follower', 'review_like', 'review_reply', 'referral',
      // Entertainment notification types
      'trailer', 'news', 'announcement', 'casting_update', 'interview'
    ],
    required: true
  },

  // Human-readable title & message
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },

  // Optional icon / image URL (avatar of requester, movie poster, etc.)
  image: {
    type: String,
    default: ''
  },

  // For follow_request
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // For community_join_request
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  },
  requestingUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Optional link the user can click
  link: {
    type: String,
    default: ''
  },

  // External link to YouTube video or news article
  externalLink: {
    type: String,
    default: ''
  },

  // Related entity for entertainment notifications
  relatedEntity: {
    name: { type: String, default: '' },
    type: { type: String, enum: ['movie', 'tv', 'actor', 'actress', ''], default: '' },
    tmdbId: { type: String, default: '' }
  },

  // Source of the notification (YouTube channel name or news publisher)
  source: {
    type: String,
    default: ''
  },

  // Unique external ID for deduplication (YouTube videoId or article URL)
  externalId: {
    type: String,
    default: ''
  },

  // Status
  read: {
    type: Boolean,
    default: false
  },
  actionTaken: {
    type: Boolean,
    default: false
  },
  actionType: {
    type: String,
    enum: ['accepted', 'rejected', null],
    default: null
  }
}, {
  timestamps: true
});

// Compound index for fast queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
// Index for deduplication: unique external content per user
notificationSchema.index({ recipient: 1, externalId: 1 }, { sparse: true });

// Force re-registration so schema changes (e.g. new enum values) always take effect
if (mongoose.models.Notification) {
  mongoose.deleteModel('Notification');
}
const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
