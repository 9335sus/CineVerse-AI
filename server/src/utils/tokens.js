const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { jwt: c, isProd } = require('../config/env');
exports.signAccess = (user) => jwt.sign({ sub: user.id, role: user.role }, c.accessSecret, { expiresIn: c.accessTtl });
exports.signRefresh = (user) => jwt.sign({ sub: user.id, jti: crypto.randomUUID() }, c.refreshSecret, { expiresIn: c.refreshTtl });
exports.verifyAccess = (t) => jwt.verify(t, c.accessSecret);
exports.verifyRefresh = (t) => jwt.verify(t, c.refreshSecret);
exports.hash = (t) => crypto.createHash('sha256').update(t).digest('hex');
exports.cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
