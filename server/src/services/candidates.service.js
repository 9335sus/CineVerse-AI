const tmdb = require('./tmdb.service');

const toMovie = (m) => ({
  id: m.id, title: m.title, overview: m.overview, posterPath: m.poster_path, releaseDate: m.release_date,
  voteAverage: m.vote_average, genreIds: m.genre_ids || [], language: m.original_language, popularity: m.popularity,
});

// Pulls candidate movies from TMDB discover (genres are OR-ed), minus excluded ids.
exports.fetchCandidates = async ({ genres = [], language, pages = [1, 2], excludeIds = [], minVotes = 200 }) => {
  const exclude = new Set(excludeIds);
  const params = {
    sort_by: 'popularity.desc', 'vote_count.gte': minVotes, 'vote_average.gte': 6,
    ...(genres.length && { with_genres: [...new Set(genres)].join('|') }),
    ...(language && { with_original_language: language }),
  };
  const res = await Promise.allSettled(pages.map((p) => tmdb.get('/discover/movie', { ...params, page: p })));
  const ok = res.filter((r) => r.status === 'fulfilled');
  if (!ok.length) throw res[0].reason;
  const seen = new Set();
  return ok.flatMap((r) => r.value.results).map(toMovie).filter((m) => m.posterPath && !exclude.has(m.id) && !seen.has(m.id) && seen.add(m.id));
};

// Adds runtime (minutes) via the details endpoint; keeps the movie with runtime=null if lookup fails.
exports.attachRuntimes = async (movies) => {
  const res = await Promise.allSettled(movies.map((m) => tmdb.get(`/movie/${m.id}`)));
  return movies.map((m, i) => ({ ...m, runtime: res[i].status === 'fulfilled' ? res[i].value.runtime || null : null }));
};

exports.genreMap = async () => {
  const d = await tmdb.get('/genre/movie/list');
  return Object.fromEntries(d.genres.map((g) => [g.id, g.name]));
};
