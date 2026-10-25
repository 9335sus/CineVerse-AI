// Fairness-aware group matching (pure functions).
const { MOOD_GENRES } = require('./recommendation.service');

const W = { genre: 0.45, mood: 0.15, language: 0.15, runtime: 0.15, quality: 0.1 };
const overlap = (wanted, have) => (wanted.length ? Math.min(wanted.filter((g) => have.has(g)).length / Math.min(wanted.length, 3), 1) : 0);
const r1 = (n) => Math.round(n * 1000) / 10; // 0..1 -> 0..100 (1 decimal)

// How satisfied one participant would be with one movie, 0..1.
exports.satisfaction = (movie, pref) => {
  const g = new Set(movie.genreIds || []);
  const liked = pref.genres?.length ? overlap(pref.genres, g) : 0.5;
  const mood = MOOD_GENRES[pref.mood] ? overlap(MOOD_GENRES[pref.mood], g) : 0.5;
  const lang = !pref.language || movie.language === pref.language ? 1 : 0;
  const runtime = pref.maxRuntime && movie.runtime ? (movie.runtime <= pref.maxRuntime ? 1 : 0) : 1;
  let s = W.genre * liked + W.mood * mood + W.language * lang + W.runtime * runtime + W.quality * ((movie.voteAverage || 0) / 10);
  if ((pref.dislikedGenres || []).some((x) => g.has(x))) s *= 0.3;
  return s;
};

/*
 * groupScore = 0.6*mean + 0.4*min  -> rewards movies everyone can live with, not just the majority.
 * Selection is greedy with a coverage bonus: a movie gets extra credit for lifting participants who are
 * currently least satisfied by the already-picked list, so every person's taste is represented.
 */
exports.rankForGroup = (movies, prefs, { limit = 8 } = {}) => {
  if (!prefs.length) return [];
  const maxAllowed = Math.min(...prefs.map((p) => p.maxRuntime || Infinity));
  const scored = movies.filter((m) => !m.runtime || m.runtime <= maxAllowed).map((m) => {
    const per = prefs.map((p) => ({ userId: p.userId, score: exports.satisfaction(m, p) }));
    const vals = per.map((x) => x.score);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const min = Math.min(...vals);
    return { movie: m, per, mean, min, groupScore: 0.6 * mean + 0.4 * min };
  });
  const best = Object.fromEntries(prefs.map((p) => [p.userId, 0]));
  const picked = [];
  while (picked.length < limit && scored.length) {
    let bi = 0;
    let bv = -Infinity;
    scored.forEach((c, i) => {
      const bonus = c.per.reduce((a, x) => a + (1 - best[x.userId]) * Math.max(0, x.score - best[x.userId]), 0) / prefs.length;
      const v = c.groupScore + 0.25 * bonus;
      if (v > bv) { bv = v; bi = i; }
    });
    const [c] = scored.splice(bi, 1);
    c.per.forEach((x) => { best[x.userId] = Math.max(best[x.userId], x.score); });
    picked.push(c);
  }
  return picked.map((c) => ({
    ...c.movie, groupScore: r1(c.groupScore), mean: r1(c.mean), min: r1(c.min),
    perUser: c.per.map((x) => ({ userId: x.userId, score: r1(x.score) })),
  }));
};
