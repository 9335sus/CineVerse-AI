const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    tmdbId: { type: Number, required: true },
    movieTitle: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
    content: { type: String, required: true, trim: true, maxlength: 1500 },
    isSpoiler: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    reportsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
schema.index({ tmdbId: 1, parent: 1, createdAt: -1 });
module.exports = mongoose.model('Comment', schema);
