const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/rooms.service');

const broadcast = (req, room) => req.app.get('io')?.to(room.code).emit('room:updated', svc.serialize(room));
const reply = (req, res, room, status = 200) => res.status(status).json({ success: true, room: svc.serialize(room, req.user.id) });

exports.mine = asyncHandler(async (req, res) => {
  const rooms = await svc.listMine(req.user.id);
  res.json({ success: true, rooms: rooms.map((r) => ({ code: r.code, name: r.name, status: r.status, members: r.members.length, updatedAt: r.updatedAt })) });
});
exports.create = asyncHandler(async (req, res) => reply(req, res, await svc.create(req.user, req.body.name), 201));
exports.join = asyncHandler(async (req, res) => {
  const { room, joined } = await svc.join(req.body.code, req.user.id);
  if (joined) broadcast(req, room);
  reply(req, res, room);
});
exports.get = asyncHandler(async (req, res) => reply(req, res, await svc.getRoomForMember(req.params.code, req.user.id)));
exports.preferences = asyncHandler(async (req, res) => {
  const room = await svc.submitPreferences(req.params.code, req.user.id, req.body);
  broadcast(req, room); reply(req, res, room);
});
exports.recommend = asyncHandler(async (req, res) => {
  const room = await svc.generate(req.params.code, req.user.id);
  broadcast(req, room); reply(req, res, room);
});
exports.vote = asyncHandler(async (req, res) => {
  const room = await svc.castVote(req.params.code, req.user.id, req.body.tmdbId);
  broadcast(req, room); reply(req, res, room);
});
exports.decide = asyncHandler(async (req, res) => {
  const room = await svc.decide(req.params.code, req.user.id);
  broadcast(req, room); reply(req, res, room);
});
exports.remove = asyncHandler(async (req, res) => {
  const room = await svc.remove(req.params.code, req.user.id);
  req.app.get('io')?.to(room.code).emit('room:closed');
  res.json({ success: true });
});
