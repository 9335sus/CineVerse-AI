const UserMovie = require('../models/UserMovie');
exports.markWatched = async (userId, m) => {
  const doc = (await UserMovie.findOne({ user: userId, tmdbId: m.tmdbId })) || new UserMovie({ user: userId, tmdbId: m.tmdbId });
  Object.assign(doc, { title: m.title, posterPath: m.posterPath, releaseDate: m.releaseDate, voteAverage: m.voteAverage, genreIds: m.genreIds || [] });
  doc.watched = true; doc.inWatchlist = false; doc.watchedAt = doc.watchedAt || new Date();
  await doc.save();
};
