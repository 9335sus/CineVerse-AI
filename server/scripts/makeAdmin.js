// Usage: npm run make-admin -- someone@example.com
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
(async () => {
  const email = (process.argv[2] || '').toLowerCase();
  if (!email) { console.error('Usage: npm run make-admin -- user@example.com'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  const u = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
  console.log(u ? `${u.email} is now an admin` : `No user found with email ${email}`);
  await mongoose.disconnect();
})();
