// Pure helpers for the Movie DNA dashboard (aggregation results in -> chart-ready data out).
exports.genreCounts = (items) => {
  const m = new Map();
  items.forEach((i) => (i.genreIds || []).forEach((g) => m.set(g, (m.get(g) || 0) + 1)));
  return m;
};
exports.topGenreIds = (items, n = 5) => [...exports.genreCounts(items)].sort((a, b) => b[1] - a[1]).slice(0, n).map((x) => x[0]);

exports.cosine = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of a) { na += v * v; if (b.has(k)) dot += v * b.get(k); }
  for (const v of b.values()) nb += v * v;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
};

// 0-100: 80% genre-taste similarity + 20% overlap in actually watched movies (capped at 5 shared).
exports.compatibility = (mine, theirs, shared = 0) => Math.round(100 * (0.8 * exports.cosine(mine, theirs) + 0.2 * Math.min(shared, 5) / 5));

exports.fillMonths = (rows, n = 12, now = new Date()) => {
  const by = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    const month = d.toISOString().slice(0, 7);
    return { month, label: d.toLocaleString('en', { month: 'short', timeZone: 'UTC' }) + " '" + String(d.getUTCFullYear()).slice(2), count: by[month] || 0 };
  });
};
exports.fillDays = (rows, n = 14, now = new Date()) => {
  const by = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (n - 1 - i)));
    const day = d.toISOString().slice(0, 10);
    return { day, label: day.slice(5), count: by[day] || 0 };
  });
};
exports.fillRatings = (rows) => {
  const by = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return Array.from({ length: 10 }, (_, i) => ({ rating: i + 1, count: by[i + 1] || 0 }));
};

const PERSONAS = {
  53: ['The Edge-of-Seat Detective', 'You love tension, twists, and puzzles that keep you guessing.'],
  27: ['The Fearless Night Owl', 'Dark rooms and racing hearts are your comfort zone.'],
  28: ['The Adrenaline Chaser', 'Big set pieces and momentum keep you hooked.'],
  878: ['The Future Gazer', 'You are drawn to big ideas and what-if worlds.'],
  35: ['The Mood Lifter', 'You watch to laugh, and you spread the good mood.'],
  18: ['The Deep Feeler', 'You want stories with weight, character, and honest emotion.'],
  10749: ['The Hopeless Romantic', 'Chemistry and heart matter most to you.'],
  16: ['The Eternal Kid at Heart', 'You appreciate imagination, craft, and a good animated world.'],
  12: ['The Born Explorer', 'You like to be taken somewhere new.'],
  80: ['The Case Cracker', 'You enjoy clever crimes and moral gray areas.'],
  99: ['The Curious Mind', 'You watch to learn something real.'],
  14: ['The Dreamer', 'Magic and myth are your escape.'],
  9648: ['The Armchair Sleuth', 'You like to solve it before the reveal.'],
  36: ['The Time Traveler', 'You enjoy seeing how the past shaped us.'],
  10752: ['The Historian at Heart', 'Stories of conflict and courage stay with you.'],
  10751: ['The Family Curator', 'You pick films everyone can enjoy together.'],
  10402: ['The Soundtrack Devotee', 'For you, music is half the movie.'],
};

exports.insights = ({ topGenreIds = [], topShare = 0, distinctGenres = 0, avgRating = null, ratedCount = 0, totalWatched = 0 }) => {
  if (!totalWatched) return [];
  const out = [];
  const p = PERSONAS[topGenreIds[0]];
  if (p) out.push({ title: p[0], text: p[1] });
  if (distinctGenres >= 10) out.push({ title: 'The Genre Explorer', text: `You have watched across ${distinctGenres} genres, so your taste is wide.` });
  else if (topShare >= 0.4) out.push({ title: 'The Specialist', text: `About ${Math.round(topShare * 100)}% of your watching sits in one genre.` });
  if (ratedCount >= 3 && avgRating != null) {
    if (avgRating >= 8) out.push({ title: 'The Generous Critic', text: `Your average rating is ${avgRating.toFixed(1)}/10. You enjoy what you watch.` });
    else if (avgRating <= 5.5) out.push({ title: 'The Tough Critic', text: `Your average rating is ${avgRating.toFixed(1)}/10. Few films impress you.` });
    else out.push({ title: 'The Balanced Critic', text: `Your average rating is ${avgRating.toFixed(1)}/10. You call it as you see it.` });
  }
  return out;
};
