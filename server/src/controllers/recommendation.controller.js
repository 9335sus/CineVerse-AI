const Recommendation = require('../models/Recommendation');
const UserMovie = require('../models/UserMovie');
const AiUsage = require('../models/AiUsage');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination } = require('../utils/pagination');
const ai = require('../services/ai.service');
const { fetchCandidates, attachRuntimes, genreMap } = require('../services/candidates.service');
const { MOOD_GENRES, rankMovies, fallbackExplanation } = require('../services/recommendation.service');

// One AI call explains all picks; any failure falls back to rule-based text per movie.
async function explain(user, prefs, movies, gMap) {
  const out = Object.fromEntries(movies.map((m) => [m.id, { text: fallbackExplanation(m, prefs, gMap), source: 'rules' }]));
  const started = Date.now();
  let success = false;
  let error;
  if (ai.isConfigured()) {
    try {
      const list = movies.map((m) => ({ id: m.id, title: m.title, year: (m.releaseDate || '').slice(0, 4), genres: (m.genreIds || []).map((g) => gMap[g]).filter(Boolean), overview: (m.overview || '').slice(0, 220) }));
      const text = await ai.complete({
        system: 'You are CineVerse AI, a concise movie recommender. Reply with a single JSON object and nothing else.',
        prompt: `Viewer preferences: mood=${prefs.mood}, intensity=${prefs.intensity}, time available=${prefs.timeMinutes || 'any'} min, favorite genres=${(prefs.genres || []).map((g) => gMap[g]).join(', ') || 'any'}.\nMovies: ${JSON.stringify(list)}\nFor each movie write one friendly sentence (max 35 words) explaining why it suits this viewer. Use only the facts given; do not invent plot details. Return a JSON object mapping each movie id (as a string) to its sentence.`,
        maxTokens: 900,
      });
      const parsed = ai.parseJsonObject(text);
      movies.forEach((m) => {
        if (typeof parsed[m.id] === 'string' && parsed[m.id].trim()) out[m.id] = { text: parsed[m.id].trim().slice(0, 300), source: 'ai' };
      });
      success = Object.values(out).some((o) => o.source === 'ai');
    } catch (e) { error = String(e.message).slice(0, 200); }
  } else error = 'not configured';
  AiUsage.create({ user: user.id, feature: 'mood', provider: ai.provider, model: ai.model, success, fallbackUsed: !success || Object.values(out).some((o) => o.source === 'rules'), latencyMs: Date.now() - started, error }).catch(() => {});
  return out;
}

exports.mood = asyncHandler(async (req, res) => {
  const b = req.body;
  const prefs = { mood: b.mood, genres: b.genres || [], language: b.language || '', timeMinutes: b.timeMinutes || null, intensity: b.intensity || 'medium' };
  const userGenres = req.user.favoriteGenres || [];

  const watched = await UserMovie.find({ user: req.user.id, watched: true }).distinct('tmdbId');
  const pool = prefs.genres.length ? prefs.genres : MOOD_GENRES[prefs.mood] || [];
  const candidates = await fetchCandidates({ genres: pool, language: prefs.language, excludeIds: watched, pages: [1, 2] });

  const shortlist = rankMovies(candidates, prefs, userGenres).slice(0, 15);
  const top = rankMovies(await attachRuntimes(shortlist), prefs, userGenres).slice(0, 6);
  if (!top.length) return res.json({ success: true, recommendation: null, message: 'No unwatched movies matched. Try more genres or a longer time limit.' });

  const gMap = await genreMap();
  const explanations = await explain(req.user, prefs, top, gMap);
  const rec = await Recommendation.create({
    user: req.user.id, preferences: prefs, aiUsed: Object.values(explanations).some((e) => e.source === 'ai'),
    results: top.map((m) => ({
      tmdbId: m.id, title: m.title, posterPath: m.posterPath, releaseDate: m.releaseDate, voteAverage: m.voteAverage, runtime: m.runtime,
      genreIds: m.genreIds, score: m.score, explanation: explanations[m.id].text, explanationSource: explanations[m.id].source,
    })),
  });
  res.status(201).json({ success: true, recommendation: rec });
});

exports.history = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 5, 20);
  const filter = { user: req.user.id };
  const [items, total] = await Promise.all([Recommendation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), Recommendation.countDocuments(filter)]);
  res.json({ success: true, items, page, totalPages: Math.ceil(total / limit) });
});

exports.remove = asyncHandler(async (req, res) => {
  const r = await Recommendation.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!r) throw new ApiError(404, 'Recommendation not found');
  res.json({ success: true });
});
