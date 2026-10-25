// Regenerate with: node postman/generate.js
const fs = require('fs');
const J = (o) => JSON.stringify(o, null, 2);
const folders = {
  Auth: [
    ['POST', 'Register', '/auth/register', { name: 'Test User', email: 'test@example.com', password: 'password123' }, false, 'setToken'],
    ['POST', 'Login', '/auth/login', { email: 'test@example.com', password: 'password123' }, false, 'setToken'],
    ['POST', 'Refresh (uses cookie)', '/auth/refresh', null, false, 'setToken'],
    ['POST', 'Logout', '/auth/logout'], ['GET', 'Me', '/auth/me', null, true],
  ],
  Users: [['PATCH', 'Update profile', '/users/me', { name: 'Test User', bio: 'Film nerd', preferredLanguage: 'en', favoriteGenres: [28, 878] }, true], ['PATCH', 'Change password', '/users/me/password', { currentPassword: 'password123', newPassword: 'password456' }, true]],
  Movies: [
    ['GET', 'Trending', '/movies/list/trending'], ['GET', 'Popular', '/movies/list/popular'], ['GET', 'Upcoming', '/movies/list/upcoming'], ['GET', 'Top rated', '/movies/list/top-rated'],
    ['GET', 'Genres', '/movies/genres'], ['GET', 'Search with filters', '/movies/search?query=matrix&genre=28&language=en&year=1999&minRating=7'], ['GET', 'Movie details', '/movies/603'],
  ],
  Watchlist: [
    ['GET', 'List watchlist', '/watchlist?status=watchlist', null, true], ['GET', 'List watched', '/watchlist?status=watched', null, true], ['GET', 'Status', '/watchlist/603', null, true],
    ['PUT', 'Add / update', '/watchlist/603', { title: 'The Matrix', posterPath: '/p.jpg', genreIds: [28, 878], inWatchlist: true }, true],
    ['PUT', 'Mark watched', '/watchlist/603', { title: 'The Matrix', genreIds: [28, 878], watched: true }, true], ['DELETE', 'Remove', '/watchlist/603', null, true],
  ],
  Reviews: [
    ['GET', 'Reviews for movie', '/reviews/movie/603'], ['GET', 'My reviews', '/reviews/me', null, true],
    ['PUT', 'Create / update review', '/reviews/movie/603', { movieTitle: 'The Matrix', rating: 9, content: 'Still holds up.' }, true],
    ['DELETE', 'Delete review', '/reviews/:reviewId', null, true], ['POST', 'Report review', '/reviews/:reviewId/report', { reason: 'spam' }, true],
  ],
  'AI Mood Matcher': [
    ['POST', 'Recommend by mood', '/recommendations/mood', { mood: 'happy', genres: [35], intensity: 'light', timeMinutes: 120, language: 'en' }, true],
    ['GET', 'History', '/recommendations/history', null, true], ['DELETE', 'Delete history item', '/recommendations/:id', null, true],
  ],
  'CineSync Rooms': [
    ['GET', 'My rooms', '/rooms', null, true], ['POST', 'Create room', '/rooms', { name: 'Friday movie night' }, true, 'setRoom'], ['POST', 'Join room', '/rooms/join', { code: '{{roomCode}}' }, true],
    ['GET', 'Get room', '/rooms/{{roomCode}}', null, true],
    ['PUT', 'Submit preferences', '/rooms/{{roomCode}}/preferences', { genres: [28], dislikedGenres: [27], language: 'en', maxRuntime: 150, mood: 'excited' }, true],
    ['POST', 'Generate group picks (host)', '/rooms/{{roomCode}}/recommendations', null, true], ['POST', 'Vote (toggle)', '/rooms/{{roomCode}}/vote', { tmdbId: 603 }, true],
    ['POST', 'Decide (host)', '/rooms/{{roomCode}}/decide', null, true], ['DELETE', 'Close room (host)', '/rooms/{{roomCode}}', null, true],
  ],
  'Smart Planner': [
    ['POST', 'Suggest movies', '/planner/suggest', { timeMinutes: 120, mood: 'relaxed', genres: [35], language: 'en' }, true], ['GET', 'List plans', '/planner?status=planned', null, true],
    ['POST', 'Create plan', '/planner', { tmdbId: 603, title: 'The Matrix', runtime: 136, genreIds: [28], scheduledFor: '2026-12-01T20:00:00.000Z', note: 'Pizza night' }, true],
    ['PATCH', 'Edit plan', '/planner/:planId', { note: 'Bring snacks', scheduledFor: null }, true], ['PATCH', 'Complete plan', '/planner/:planId', { status: 'completed' }, true], ['DELETE', 'Delete plan', '/planner/:planId', null, true],
  ],
  'Story Simulator': [
    ['POST', 'Create story', '/stories', { tmdbId: 603, whatIf: 'What if Neo refused the call?', spoilerLevel: 'none' }, true], ['GET', 'List stories', '/stories', null, true],
    ['GET', 'Get story', '/stories/:storyId', null, true], ['POST', 'Choose option', '/stories/:storyId/choose', { choiceIndex: 0 }, true], ['POST', 'Write your own choice', '/stories/:storyId/choose', { custom: 'He calls his boss instead' }, true], ['DELETE', 'Delete story', '/stories/:storyId', null, true],
  ],
  'Spoiler-safe Discussions': [
    ['GET', 'List comments', '/discussions/603', null, true], ['GET', 'My progress', '/discussions/603/progress', null, true], ['PUT', 'Set progress', '/discussions/603/progress', { status: 'finished' }, true],
    ['POST', 'Post comment', '/discussions/603/comments', { content: 'That ending!', isSpoiler: true, movieTitle: 'The Matrix' }, true], ['POST', 'Reply', '/discussions/603/comments', { content: 'Agreed', parent: '{{commentId}}' }, true],
    ['GET', 'Reveal spoiler', '/discussions/comments/:commentId/reveal', null, true], ['POST', 'Report comment', '/discussions/comments/:commentId/report', { reason: 'harassment', details: 'optional' }, true], ['DELETE', 'Delete comment', '/discussions/comments/:commentId', null, true],
  ],
  'Movie DNA': [['GET', 'DNA dashboard data', '/analytics/dna', null, true], ['GET', 'Friend compatibility', '/analytics/compatibility', null, true]],
  'Admin (admin role)': [
    ['GET', 'Platform analytics', '/admin/analytics', null, true], ['GET', 'AI usage', '/admin/ai-usage', null, true], ['GET', 'Users', '/admin/users?search=&page=1', null, true],
    ['PATCH', 'Update user', '/admin/users/:userId', { role: 'user', isActive: true }, true], ['GET', 'Reviews (reported)', '/admin/reviews?filter=reported', null, true],
    ['PATCH', 'Hide / restore review', '/admin/reviews/:reviewId', { isHidden: true }, true], ['DELETE', 'Delete review', '/admin/reviews/:reviewId', null, true],
    ['GET', 'Reports', '/admin/reports?status=open', null, true], ['PATCH', 'Resolve report', '/admin/reports/:reportId', { action: 'hide', note: 'Confirmed spoiler abuse' }, true],
  ],
};
const script = (kind) => kind === 'setToken' ? ['const r = pm.response.json();', 'if (r.accessToken) pm.collectionVariables.set("token", r.accessToken);'] : ['const r = pm.response.json();', 'if (r.room) pm.collectionVariables.set("roomCode", r.room.code);'];
const item = ([method, name, path, body, auth, hook]) => ({
  name: `${method} ${name}`,
  request: {
    method, header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    ...(auth ? { auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] } } : { auth: { type: 'noauth' } }),
    ...(body ? { body: { mode: 'raw', raw: J(body) } } : {}),
    url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.split('?')[0].split('/').filter(Boolean), ...(path.includes('?') ? { query: path.split('?')[1].split('&').map((p) => ({ key: p.split('=')[0], value: p.split('=')[1] })) } : {}) },
  },
  ...(hook ? { event: [{ listen: 'test', script: { type: 'text/javascript', exec: script(hook) } }] } : {}),
});
const col = {
  info: { name: 'CineVerse AI API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json', description: 'Run Register or Login first: it stores the access token in {{token}}. Replace :placeholders in paths with real ids.' },
  variable: [{ key: 'baseUrl', value: 'http://localhost:5000/api/v1' }, { key: 'token', value: '' }, { key: 'roomCode', value: '' }, { key: 'commentId', value: '' }],
  item: Object.entries(folders).map(([name, items]) => ({ name, item: items.map(item) })),
};
fs.writeFileSync(__dirname + '/CineVerse.postman_collection.json', J(col));
console.log('requests:', Object.values(folders).flat().length);
