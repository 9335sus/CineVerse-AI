const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tmdbId: { type: Number, required: true },
    movie: { title: String, posterPath: String, overview: String, tagline: String, genres: [String] },
    premise: { type: String, required: true, maxlength: 300 }, // the user's "what if"
    spoilerLevel: { type: String, enum: ['none', 'light', 'full'], default: 'none' },
    segments: [{ _id: false, narrative: String, choices: [String], chosen: String }],
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    aiGenerated: { type: Boolean, default: true },
  },
  { timestamps: true }
);
schema.index({ user: 1, updatedAt: -1 });
module.exports = mongoose.model('Story', schema);
