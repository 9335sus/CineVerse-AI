const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    feature: { type: String, required: true }, // mood | story | planner ...
    provider: String,
    model: String,
    success: Boolean,
    fallbackUsed: Boolean,
    latencyMs: Number,
    error: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ createdAt: -1 });
module.exports = mongoose.model('AiUsage', schema);
