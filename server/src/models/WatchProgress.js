const mongoose = require('mongoose');
// Per-user, per-movie progress that controls which spoilers the server will reveal.
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tmdbId: { type: Number, required: true },
    status: { type: String, enum: ['not_started', 'watching', 'finished'], default: 'not_started' },
  },
  { timestamps: true }
);
schema.index({ user: 1, tmdbId: 1 }, { unique: true });
module.exports = mongoose.model('WatchProgress', schema);
