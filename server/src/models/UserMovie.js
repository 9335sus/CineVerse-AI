const mongoose = require('mongoose');
// One document per (user, movie): watchlist + watched state and a snapshot of TMDB data.
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tmdbId: { type: Number, required: true },
    title: { type: String, required: true },
    posterPath: String,
    releaseDate: String,
    voteAverage: Number,
    genreIds: [Number],
    inWatchlist: { type: Boolean, default: false },
    watched: { type: Boolean, default: false },
    watchedAt: Date,
  },
  { timestamps: true }
);
schema.index({ user: 1, tmdbId: 1 }, { unique: true });
schema.index({ user: 1, inWatchlist: 1, updatedAt: -1 });
schema.index({ user: 1, watched: 1, watchedAt: -1 });
module.exports = mongoose.model('UserMovie', schema);
