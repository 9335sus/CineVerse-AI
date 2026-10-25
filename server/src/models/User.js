const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    avatar: { type: String, default: '' },
    bio: { type: String, maxlength: 300, default: '' },
    favoriteGenres: [Number],
    preferredLanguage: { type: String, default: 'en' },
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};
userSchema.methods.toSafe = function () {
  const { _id, name, email, role, avatar, bio, favoriteGenres, preferredLanguage, createdAt } = this;
  return { id: _id, name, email, role, avatar, bio, favoriteGenres, preferredLanguage, createdAt };
};
module.exports = mongoose.model('User', userSchema);
