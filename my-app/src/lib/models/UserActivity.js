import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Recently viewed movies/TV
  recentViews: [{
    mediaId: { type: String, required: true },
    mediaType: { type: String, enum: ['movie', 'tv'], required: true },
    title: { type: String, default: '' },
    genres: [{ type: String }],
    viewedAt: { type: Date, default: Date.now }
  }],

  // Actors/actresses whose profiles the user visits
  viewedActors: [{
    actorId: { type: String, required: true },
    name: { type: String, default: '' },
    viewedAt: { type: Date, default: Date.now }
  }],

  // Genre frequency counts
  genreFrequency: {
    type: Map,
    of: Number,
    default: new Map()
  },

  // Timestamp of last notification generation for this user
  lastNotificationGenAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Keep recentViews and viewedActors trimmed
userActivitySchema.pre('save', function () {
  if (this.recentViews && this.recentViews.length > 50) {
    this.recentViews = this.recentViews.slice(-50);
  }
  if (this.viewedActors && this.viewedActors.length > 30) {
    this.viewedActors = this.viewedActors.slice(-30);
  }
});

if (mongoose.models.UserActivity) {
  mongoose.deleteModel('UserActivity');
}
const UserActivity = mongoose.model('UserActivity', userActivitySchema);

export default UserActivity;
