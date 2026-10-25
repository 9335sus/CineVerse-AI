const tmdb = require('../services/tmdb.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

const LISTS = { trending: '/trending/movie/week', popular: '/movie/popular', upcoming: '/movie/upcoming', 'top-rated': '/movie/top_rated' };
const page = (q) => Math.min(Math.max(parseInt(q.page) || 1, 1), 500);
const slim = (m) => ({
  id: m.id, title: m.title, overview: m.overview, posterPath: m.poster_path, backdropPath: m.backdrop_path,
  releaseDate: m.release_date, voteAverage: m.vote_average, genreIds: m.genre_ids, language: m.original_language,
});
const shape = (d) => ({ page: d.page, totalPages: Math.min(d.total_pages, 500), totalResults: d.total_results, results: d.results.map(slim) });

exports.list = asyncHandler(async (req, res) => {
  const path = LISTS[req.params.category];
  if (!path) throw new ApiError(404, 'Unknown movie list');
  res.json({ success: true, ...shape(await tmdb.get(path, { page: page(req.query) })) });
});

// Movies releasing in the next ~6 months, most popular first. Optional original-language filter.
exports.upcoming = asyncHandler(async (req, res) => {
  const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  const d = await tmdb.get('/discover/movie', {
    page: page(req.query), sort_by: 'popularity.desc',
    'primary_release_date.gte': day(0), 'primary_release_date.lte': day(180),
    ...(req.query.language && { with_original_language: req.query.language }),
  });
  d.results = d.results.filter((m) => m.poster_path); // skip placeholder entries with no artwork
  res.json({ success: true, ...shape(d) });
});

// Where a movie can be watched legally (stream / free / rent / buy) in one country. Data: JustWatch via TMDB.
exports.providers = asyncHandler(async (req, res) => {
  const region = /^[A-Za-z]{2}$/.test(req.query.region || '') ? req.query.region.toUpperCase() : 'IN';
  const d = await tmdb.get(`/movie/${req.params.id}/watch/providers`);
  const r = d.results?.[region] || {};
  const pick = (list) => [...(list || [])].sort((a, b) => a.display_priority - b.display_priority).map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }));
  res.json({ success: true, region, link: r.link || null, stream: pick(r.flatrate), free: pick(r.free), ads: pick(r.ads), rent: pick(r.rent), buy: pick(r.buy), attribution: 'JustWatch' });
});

exports.genres = asyncHandler(async (req, res) => {
  const d = await tmdb.get('/genre/movie/list');
  res.json({ success: true, genres: d.genres });
});

exports.search = asyncHandler(async (req, res) => {
  const { query, genre, language, year, minRating, sortBy } = req.query;
  const p = page(req.query);
  const min = parseFloat(minRating) || 0;
  let d;
  if (query && query.trim()) {
    d = await tmdb.get('/search/movie', { query: query.trim(), page: p, ...(year && { primary_release_year: year }) });
    d.results = d.results.filter(
      (m) => (!genre || m.genre_ids.includes(+genre)) && (!language || m.original_language === language) && m.vote_average >= min
    );
  } else {
    d = await tmdb.get('/discover/movie', {
      page: p, sort_by: sortBy || 'popularity.desc', 'vote_count.gte': 50,
      ...(genre && { with_genres: genre }), ...(language && { with_original_language: language }),
      ...(year && { primary_release_year: year }), ...(min && { 'vote_average.gte': min }),
    });
  }
  res.json({ success: true, ...shape(d) });
});

exports.details = asyncHandler(async (req, res) => {
  const m = await tmdb.get(`/movie/${req.params.id}`, { append_to_response: 'credits,videos,similar' });
  const vids = m.videos?.results || [];
  const trailer = vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer') || vids.find((v) => v.site === 'YouTube');
  res.json({
    success: true,
    movie: {
      ...slim({ ...m, genre_ids: m.genres.map((g) => g.id) }),
      tagline: m.tagline, runtime: m.runtime, status: m.status, genres: m.genres, voteCount: m.vote_count,
      trailerKey: trailer?.key || null,
      cast: (m.credits?.cast || []).slice(0, 12).map((c) => ({ id: c.id, name: c.name, character: c.character, profilePath: c.profile_path })),
      director: (m.credits?.crew || []).find((c) => c.job === 'Director')?.name || null,
      similar: (m.similar?.results || []).slice(0, 12).map(slim),
    },
  });
});
