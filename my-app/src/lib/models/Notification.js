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
    enum: ['follow_request', 'community_join_request', 'ai_generated', 'new_follower', 'lost_follower'],
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

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
