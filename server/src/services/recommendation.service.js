// Pure, testable scoring logic for the AI Mood Movie Matcher (no DB / network here).
const MOOD_GENRES = {
  happy: [35, 10751, 16, 10402], excited: [28, 12, 878], relaxed: [35, 10749, 16, 99], romantic: [10749, 35, 18],
  thoughtful: [18, 99, 36, 9648], scared: [27, 53], sad: [18, 10749], adventurous: [12, 14, 878],
  nostalgic: [10751, 16, 12, 35], curious: [9648, 878, 99],
};
const INTENSITY_GENRES = { light: [35, 10751, 16, 10749, 10402], medium: [12, 14, 878, 9648, 18], intense: [27, 53, 80, 10752, 28] };

const overlap = (wanted, have) => (wanted.length ? Math.min(wanted.filter((g) => have.has(g)).length / Math.min(wanted.length, 3), 1) : 0);

const runtimeFit = (runtime, limit) => {
  if (!limit || !runtime) return 0.5; // unknown -> neutral
  if (runtime > limit) return 0;
  return 0.6 + 0.4 * (runtime / limit);
};

// Returns { score: 0-100, breakdown }
exports.scoreMovie = (movie, prefs, userGenres = []) => {
  const g = new Set(movie.genreIds || []);
  const breakdown = {
    genre: overlap(prefs.genres || [], g) * 30,
    mood: overlap(MOOD_GENRES[prefs.mood] || [], g) * 25,
    intensity: overlap(INTENSITY_GENRES[prefs.intensity] || [], g) * 15,
    profile: overlap(userGenres, g) * 5,
    quality: ((movie.voteAverage || 0) / 10) * 15,
    runtime: runtimeFit(movie.runtime, prefs.timeMinutes) * 10,
  };
  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score: Math.round(score * 10) / 10, breakdown };
};

// Filters out movies that are too long (when runtime is known), scores, and sorts.
exports.rankMovies = (movies, prefs, userGenres = []) =>
  movies
    .filter((m) => !(prefs.timeMinutes && m.runtime && m.runtime > prefs.timeMinutes))
    .map((m) => ({ ...m, ...exports.scoreMovie(m, prefs, userGenres) }))
    .sort((a, b) => b.score - a.score);

const names = (ids, map) => (ids || []).map((i) => map[i]).filter(Boolean);

// Rule-based explanation used when AI is unavailable.
exports.fallbackExplanation = (movie, prefs, genreMap = {}) => {
  const moodGenres = names((movie.genreIds || []).filter((g) => (MOOD_GENRES[prefs.mood] || []).includes(g)), genreMap);
  const chosen = names((movie.genreIds || []).filter((g) => (prefs.genres || []).includes(g)), genreMap);
  const parts = [];
  if (chosen.length) parts.push(`it matches your picks (${chosen.join(', ')})`);
  if (moodGenres.length) parts.push(`${moodGenres.join('/')} fits a ${prefs.mood} mood`);
  if (movie.voteAverage >= 7.5) parts.push(`it is well rated at ${movie.voteAverage.toFixed(1)}/10`);
  if (prefs.timeMinutes && movie.runtime) parts.push(`it runs ${movie.runtime} min, within your ${prefs.timeMinutes} min`);
  if (!parts.length) parts.push('it is a popular, well-reviewed pick');
  const s = parts.join('; ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
};

exports.MOOD_GENRES = MOOD_GENRES;
exports.INTENSITY_GENRES = INTENSITY_GENRES;
