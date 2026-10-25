const { Server } = require('socket.io');
const { clientUrl } = require('../config/env');
const { verifyAccess } = require('../utils/tokens');
const User = require('../models/User');
const rooms = require('../services/rooms.service');

module.exports = (httpServer) => {
  const io = new Server(httpServer, { cors: { origin: clientUrl.split(','), credentials: true } });
  const presence = new Map(); // code -> Map(userId -> { name, sockets:Set })

  const emitPresence = (code) => {
    const m = presence.get(code);
    io.to(code).emit('room:presence', m ? [...m.entries()].map(([userId, v]) => ({ userId, name: v.name })) : []);
  };
  const leave = (socket, code) => {
    const m = presence.get(code);
    const u = m?.get(socket.data.user.id);
    if (u) { u.sockets.delete(socket.id); if (!u.sockets.size) m.delete(socket.data.user.id); if (!m.size) presence.delete(code); }
    socket.leave(code);
    emitPresence(code);
  };

  // Authenticate every connection with the short-lived access token.
  io.use(async (socket, next) => {
    try {
      const payload = verifyAccess(socket.handshake.auth?.token || '');
      const user = await User.findById(payload.sub).select('name isActive');
      if (!user || !user.isActive) throw new Error('inactive');
      socket.data.user = { id: user.id, name: user.name };
      socket.data.codes = new Set();
      next();
    } catch { next(new Error('Authentication failed')); }
  });

  io.on('connection', (socket) => {
    socket.on('room:join', async ({ code } = {}, ack) => {
      try {
        const room = await rooms.getRoomForMember(code, socket.data.user.id); // membership enforced
        socket.join(room.code);
        socket.data.codes.add(room.code);
        const m = presence.get(room.code) || new Map();
        const u = m.get(socket.data.user.id) || { name: socket.data.user.name, sockets: new Set() };
        u.sockets.add(socket.id); m.set(socket.data.user.id, u); presence.set(room.code, m);
        emitPresence(room.code);
        ack?.({ ok: true, room: rooms.serialize(room, socket.data.user.id) });
      } catch (e) { ack?.({ ok: false, message: e.message }); }
    });

    socket.on('room:leave', ({ code } = {}) => {
      const c = String(code || '').toUpperCase();
      if (socket.data.codes.delete(c)) leave(socket, c);
    });

    socket.on('room:vote', async ({ code, tmdbId } = {}, ack) => {
      try {
        const room = await rooms.castVote(code, socket.data.user.id, tmdbId);
        io.to(room.code).emit('room:updated', rooms.serialize(room));
        ack?.({ ok: true });
      } catch (e) { ack?.({ ok: false, message: e.message }); }
    });

    // Spoiler-safe discussion rooms: clients are only told "something changed" and refetch,
    // because spoiler redaction is per viewer and must never be broadcast.
    socket.on('discussion:join', ({ tmdbId } = {}) => { if (Number.isInteger(+tmdbId)) socket.join(`d:${+tmdbId}`); });
    socket.on('discussion:leave', ({ tmdbId } = {}) => { if (Number.isInteger(+tmdbId)) socket.leave(`d:${+tmdbId}`); });

    socket.on('disconnect', () => { socket.data.codes.forEach((c) => leave(socket, c)); });
  });
  return io;
};
