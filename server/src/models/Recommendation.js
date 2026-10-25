const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    preferences: { mood: String, genres: [Number], language: String, timeMinutes: Number, intensity: String },
    results: [
      {
        _id: false, tmdbId: Number, title: String, posterPath: String, releaseDate: String, voteAverage: Number,
        runtime: Number, genreIds: [Number], score: Number, explanation: String, explanationSource: { type: String, enum: ['ai', 'rules'] },
      },
    ],
    aiUsed: Boolean,
  },
  { timestamps: true }
);
schema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model('Recommendation', schema);
