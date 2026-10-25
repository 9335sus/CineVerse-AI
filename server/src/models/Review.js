const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tmdbId: { type: Number, required: true, index: true },
    movieTitle: { type: String, required: true },
    posterPath: String,
    rating: { type: Number, required: true, min: 1, max: 10 },
    content: { type: String, trim: true, maxlength: 2000, default: '' },
    reportsCount: { type: Number, default: 0 },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);
schema.index({ user: 1, tmdbId: 1 }, { unique: true });
schema.index({ tmdbId: 1, createdAt: -1 });
module.exports = mongoose.model('Review', schema);
