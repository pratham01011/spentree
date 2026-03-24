const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username:     { type: String, required: true, trim: true },
    email:        { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, default: null },
    googleId:     { type: String, default: null },
    avatarDataUrl: { type: String, default: null, maxlength: 200000 },
    friends: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    incomingFriendRequests: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    outgoingFriendRequests: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    notificationPrefs: {
      dailyReminder: { type: Boolean, default: false },
      dailyReminderHour: { type: Number, default: 9, min: 0, max: 23 }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
