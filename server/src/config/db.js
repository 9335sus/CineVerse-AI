const mongoose = require('mongoose');
const { mongoUri } = require('./env');
module.exports = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
};
