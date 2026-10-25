const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['comment', 'review'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: ['spam', 'harassment', 'spoiler', 'inappropriate', 'other'], required: true },
    details: { type: String, maxlength: 300, default: '' },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolution: String,
    resolutionNote: { type: String, maxlength: 300 },
  },
  { timestamps: true }
);
schema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });
schema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model('Report', schema);
