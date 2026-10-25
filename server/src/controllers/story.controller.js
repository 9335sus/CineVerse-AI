const Story = require('../models/Story');
const AiUsage = require('../models/AiUsage');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination } = require('../utils/pagination');
const tmdb = require('../services/tmdb.service');
const ai = require('../services/ai.service');
const story = require('../services/story.service');

const out = (s) => ({ ...s.toObject(), label: story.LABEL, maxSegments: story.MAX_SEGMENTS });

async function generateLogged(userId, ctx) {
  const started = Date.now();
  try {
    const seg = await story.generate(ctx);
    AiUsage.create({ user: userId, feature: 'story', provider: ai.provider, model: ai.model, success: true, fallbackUsed: false, latencyMs: Date.now() - started }).catch(() => {});
    return seg;
  } catch (e) {
    AiUsage.create({ user: userId, feature: 'story', provider: ai.provider, model: ai.model, success: false, fallbackUsed: false, latencyMs: Date.now() - started, error: String(e.message).slice(0, 200) }).catch(() => {});
    throw e;
  }
}

exports.create = asyncHandler(async (req, res) => {
  if (!ai.isConfigured()) throw new ApiError(503, 'The story simulator needs an AI provider. Ask the site admin to set AI_PROVIDER and AI_API_KEY.');
  const { tmdbId, whatIf, spoilerLevel = 'none' } = req.body;
  const m = await tmdb.get(`/movie/${tmdbId}`);
  const movie = { title: m.title, posterPath: m.poster_path, overview: (m.overview || '').slice(0, 800), tagline: m.tagline, genres: (m.genres || []).map((g) => g.name) };
  const first = await generateLogged(req.user.id, { movie, premise: whatIf, spoilerLevel, segments: [], final: false });
  const doc = await Story.create({ user: req.user.id, tmdbId, movie, premise: whatIf, spoilerLevel, segments: [first] });
  res.status(201).json({ success: true, story: out(doc) });
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 10);
  const filter = { user: req.user.id };
  const [items, total] = await Promise.all([
    Story.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).select('tmdbId movie.title movie.posterPath premise spoilerLevel status segments updatedAt'),
    Story.countDocuments(filter),
  ]);
  res.json({ success: true, items: items.map((s) => ({ id: s.id, tmdbId: s.tmdbId, title: s.movie.title, posterPath: s.movie.posterPath, premise: s.premise, spoilerLevel: s.spoilerLevel, status: s.status, parts: s.segments.length, updatedAt: s.updatedAt })), page, totalPages: Math.ceil(total / limit), label: story.LABEL });
});

const mine = async (req) => {
  const s = await Story.findOne({ _id: req.params.id, user: req.user.id });
  if (!s) throw new ApiError(404, 'Story not found');
  return s;
};
exports.get = asyncHandler(async (req, res) => res.json({ success: true, story: out(await mine(req)) }));

exports.choose = asyncHandler(async (req, res) => {
  const s = await mine(req);
  if (s.status === 'ended') throw new ApiError(409, 'This story has ended');
  const last = s.segments[s.segments.length - 1];
  const { choiceIndex, custom } = req.body;
  const chosen = custom ? custom.trim() : last.choices[choiceIndex];
  if (!chosen) throw new ApiError(400, 'Pick one of the offered choices or write your own');
  const final = s.segments.length + 1 >= story.MAX_SEGMENTS;
  const next = await generateLogged(req.user.id, { movie: s.movie, premise: s.premise, spoilerLevel: s.spoilerLevel, segments: [...s.segments.slice(0, -1), { ...last.toObject(), chosen }], final });
  last.chosen = chosen;
  s.segments.push(next);
  if (final) s.status = 'ended';
  await s.save();
  res.json({ success: true, story: out(s) });
});

exports.remove = asyncHandler(async (req, res) => {
  const r = await Story.deleteOne({ _id: req.params.id, user: req.user.id });
  if (!r.deletedCount) throw new ApiError(404, 'Story not found');
  res.json({ success: true });
});
