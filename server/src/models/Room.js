const mongoose = require('mongoose');
const { Schema } = mongoose;
const ref = { type: Schema.Types.ObjectId, ref: 'User', required: true };

const schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    host: ref,
    members: [{ _id: false, user: ref, joinedAt: { type: Date, default: Date.now } }],
    status: { type: String, enum: ['lobby', 'voting', 'decided'], default: 'lobby' },
    preferences: [
      { _id: false, user: ref, genres: [Number], dislikedGenres: [Number], language: String, maxRuntime: Number, mood: String, submittedAt: { type: Date, default: Date.now } },
    ],
    recommendations: [
      {
        _id: false, tmdbId: Number, title: String, posterPath: String, releaseDate: String, voteAverage: Number, runtime: Number,
        genreIds: [Number], language: String, groupScore: Number, mean: Number, min: Number,
        perUser: [{ _id: false, user: { type: Schema.Types.ObjectId, ref: 'User' }, score: Number }],
      },
    ],
    votes: [{ _id: false, user: ref, tmdbId: Number }],
    finalDecision: { tmdbId: Number, title: String, posterPath: String, voteCount: Number, decidedAt: Date },
  },
  { timestamps: true }
);
schema.index({ 'members.user': 1, updatedAt: -1 });
module.exports = mongoose.model('Room', schema);
