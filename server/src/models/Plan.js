const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tmdbId: { type: Number, required: true },
    title: { type: String, required: true },
    posterPath: String, releaseDate: String, voteAverage: Number, runtime: Number, genreIds: [Number],
    scheduledFor: Date,
    note: { type: String, maxlength: 300, default: '' },
    status: { type: String, enum: ['planned', 'completed'], default: 'planned' },
    completedAt: Date,
  },
  { timestamps: true }
);
schema.index({ user: 1, status: 1, scheduledFor: 1 });
// A movie can only be "planned" once at a time per user.
schema.index({ user: 1, tmdbId: 1 }, { unique: true, partialFilterExpression: { status: 'planned' } });
module.exports = mongoose.model('Plan', schema);
