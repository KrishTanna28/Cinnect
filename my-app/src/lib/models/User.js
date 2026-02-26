import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic Information
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password not required for OAuth users
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  fullName: {
    type: String,
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  emailVerified: {
    type: Boolean,
    default: false
  },

  // Privacy Settings
  isPrivate: {
    type: Boolean,
    default: false
  },

  // Follow Requests (for private accounts)
  followRequests: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedAt: { type: Date, default: Date.now }
  }],

  // OAuth Fields
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows null values while maintaining uniqueness
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },

  // Gamification System
  points: {
    total: {
      type: Number,
      default: 50, // 50 welcome points for new users
      min: 0
    },
    available: {
      type: Number,
      default: 50, // 50 welcome points for new users
      min: 0
    },
    redeemed: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  badges: [{
    badgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Badge'
    },
    name: String,
    description: String,
    icon: String,
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],
  streaks: {
    current: {
      type: Number,
      default: 0
    },
    longest: {
      type: Number,
      default: 0
    },
    lastActivityDate: Date
  },
  achievements: {
    reviewsWritten: {
      type: Number,
      default: 0
    },
    ratingsGiven: {
      type: Number,
      default: 0
    },
    commentsPosted: {
      type: Number,
      default: 0
    },
    watchPartiesJoined: {
      type: Number,
      default: 0
    },
    watchPartiesHosted: {
      type: Number,
      default: 0
    },
    friendsReferred: {
      type: Number,
      default: 0
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    totalReplies: {
      type: Number,
      default: 0
    }
  },

  // Points System Tracking
  reviewedGenres: [{
    type: String
  }],
  reviewedFormats: [{
    type: String,
    enum: ['movie', 'tv']
  }],
  averageReviewLength: {
    type: Number,
    default: 0
  },
  helpfulnessRatio: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  hasDuplicateContent: {
    type: Boolean,
    default: false
  },
  spamScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Personalization & Preferences
  preferences: {
    favoriteGenres: [{
      type: String
    }],
    favoriteActors: [{
      type: String
    }],
    favoriteDirectors: [{
      type: String
    }],
    language: {
      type: String,
      default: 'en'
    },
    theme: {
      type: String,
      enum: ['dark', 'light'],
      default: 'dark'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      watchPartyInvites: {
        type: Boolean,
        default: true
      },
      newReviews: {
        type: Boolean,
        default: true
      }
    }
  },

  // User Activity & History
  watchlist: [{
    movieId: {
      type: String, // TMDB movie ID
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  favorites: [{
    movieId: {
      type: String,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  watchHistory: [{
    movieId: {
      type: String,
      required: true
    },
    watchedAt: {
      type: Date,
      default: Date.now
    },
    watchDuration: Number, // in minutes
    completed: {
      type: Boolean,
      default: false
    }
  }],

  // Social Features
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friends: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Reviews & Ratings
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  ratings: [{
    movieId: String,
    rating: {
      type: Number,
      min: 0,
      max: 10
    },
    ratedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Referral System
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referrals: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: Date,
    rewardClaimed: {
      type: Boolean,
      default: false
    }
  }],

  // Vouchers & Rewards
  vouchers: [{
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher'
    },
    code: String,
    value: Number,
    expiresAt: Date,
    redeemed: {
      type: Boolean,
      default: false
    },
    redeemedAt: Date
  }],

  // Account Status & Security
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,

  // Password Reset
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },

  // AI Recommendation Data
  recommendationProfile: {
    genreScores: {
      type: Map,
      of: Number,
      default: new Map()
    },
    actorScores: {
      type: Map,
      of: Number,
      default: new Map()
    },
    directorScores: {
      type: Map,
      of: Number,
      default: new Map()
    },
    lastUpdated: Date
  }

}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
// Note: email, username, and referralCode already have unique indexes from schema definition
userSchema.index({ 'points.total': -1 });
userSchema.index({ level: -1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Helper function to generate unique referral code
const generateReferralCode = async function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Check if code already exists
    const existing = await mongoose.model('User').findOne({ referralCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
};

// Pre-save middleware to hash password and generate referral code
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
  
  // Generate referral code for new users
  if (this.isNew && !this.referralCode) {
    try {
      this.referralCode = await generateReferralCode();
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to add points
userSchema.methods.addPoints = function(points, reason) {
  this.points.total += points;
  this.points.available += points;
  
  // Level up logic (every 1000 points = 1 level)
  this.level = Math.floor(this.points.total / 1000) + 1;
  
  return this.save();
};

// Method to redeem points
userSchema.methods.redeemPoints = function(points) {
  if (this.points.available < points) {
    throw new Error('Insufficient points');
  }
  
  this.points.available -= points;
  this.points.redeemed += points;
  
  return this.save();
};

// Method to update streak
userSchema.methods.updateStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastActivity = this.streaks.lastActivityDate 
    ? new Date(this.streaks.lastActivityDate) 
    : null;
  
  if (lastActivity) {
    lastActivity.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      this.streaks.current += 1;
      if (this.streaks.current > this.streaks.longest) {
        this.streaks.longest = this.streaks.current;
      }
    } else if (daysDiff > 1) {
      // Streak broken
      this.streaks.current = 1;
    }
    // If daysDiff === 0, same day, don't update
  } else {
    // First activity
    this.streaks.current = 1;
    this.streaks.longest = 1;
  }
  
  this.streaks.lastActivityDate = today;
  return this.save();
};

// Method to add to watchlist
userSchema.methods.addToWatchlist = function(movieId) {
  const exists = this.watchlist.some(item => item.movieId === movieId);
  if (!exists) {
    this.watchlist.push({ movieId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove from watchlist
userSchema.methods.removeFromWatchlist = function(movieId) {
  this.watchlist = this.watchlist.filter(item => item.movieId !== movieId);
  return this.save();
};

// Method to add to favorites
userSchema.methods.addToFavorites = function(movieId) {
  const exists = this.favorites.some(item => item.movieId === movieId);
  if (!exists) {
    this.favorites.push({ movieId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove from favorites
userSchema.methods.removeFromFavorites = function(movieId) {
  this.favorites = this.favorites.filter(item => item.movieId !== movieId);
  return this.save();
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = function() {
  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  // Lock account after max attempts
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Method to handle referral rewards
userSchema.methods.processReferral = async function(referrerCode) {
  if (!referrerCode) return { success: false, message: 'No referral code provided' };
  
  // Find the referrer
  const referrer = await mongoose.model('User').findOne({ referralCode: referrerCode });
  
  if (!referrer) {
    return { success: false, message: 'Invalid referral code' };
  }
  
  if (referrer._id.equals(this._id)) {
    return { success: false, message: 'Cannot use your own referral code' };
  }
  
  // Check if already referred
  if (this.referredBy) {
    return { success: false, message: 'Already used a referral code' };
  }
  
  // Award points to both users
  const referralPoints = 200;
  
  // Update current user
  this.referredBy = referrer._id;
  this.points.total += referralPoints;
  this.points.available += referralPoints;
  await this.save();
  
  // Update referrer
  referrer.points.total += referralPoints;
  referrer.points.available += referralPoints;
  referrer.achievements.friendsReferred += 1;
  referrer.referrals.push({
    userId: this._id,
    joinedAt: new Date(),
    rewardClaimed: true
  });
  
  // Update referrer's level
  referrer.level = Math.floor(referrer.points.total / 1000) + 1;
  await referrer.save();
  
  return {
    success: true,
    message: 'Referral successful! Both users received 200 points',
    pointsAwarded: referralPoints,
    referrerName: referrer.username
  };
};

// Method to generate OTP
userSchema.methods.generateOTP = function() {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash OTP before storing
  this.otp.code = bcrypt.hashSync(otp, 10);
  this.otp.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  this.otp.attempts = 0;
  
  return otp; // Return plain OTP to send via SMS
};

// Method to verify OTP
userSchema.methods.verifyOTP = function(inputOTP) {
  // Check if OTP exists
  if (!this.otp.code) {
    return { success: false, message: 'No OTP found. Please request a new one.' };
  }
  
  // Check if OTP expired
  if (new Date() > this.otp.expiresAt) {
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }
  
  // Check attempts
  if (this.otp.attempts >= 3) {
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }
  
  // Verify OTP
  const isValid = bcrypt.compareSync(inputOTP, this.otp.code);
  
  if (!isValid) {
    this.otp.attempts += 1;
    return { success: false, message: `Invalid OTP. ${3 - this.otp.attempts} attempts remaining.` };
  }
  
  // OTP is valid
  this.mobileVerified = true;
  this.otp.code = undefined;
  this.otp.expiresAt = undefined;
  this.otp.attempts = 0;
  
  return { success: true, message: 'OTP verified successfully.' };
};

// Method to clear OTP
userSchema.methods.clearOTP = function() {
  this.otp.code = undefined;
  this.otp.expiresAt = undefined;
  this.otp.attempts = 0;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;