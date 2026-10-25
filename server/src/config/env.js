require('dotenv').config();
const isTest = process.env.NODE_ENV === 'test';
const need = (k, testDefault) => {
  const v = process.env[k] || (isTest ? testDefault : undefined);
  if (!v) throw new Error(`Missing required env var: ${k}`);
  return v;
};
module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: process.env.PORT || 5000,
  mongoUri: need('MONGO_URI', 'mongodb://localhost/test'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    accessSecret: need('JWT_ACCESS_SECRET', 'test_access_secret'),
    refreshSecret: need('JWT_REFRESH_SECRET', 'test_refresh_secret'),
    accessTtl: '15m',
    refreshTtl: '7d',
  },
  ai: { provider: (process.env.AI_PROVIDER || 'none').toLowerCase(), apiKey: process.env.AI_API_KEY, model: process.env.AI_MODEL || 'claude-sonnet-5-5', baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1' },
  tmdb: { readToken: process.env.TMDB_READ_TOKEN, apiKey: process.env.TMDB_API_KEY },
};
