process.env.NODE_ENV = 'test';
jest.mock('../src/services/tmdb.service', () => ({ get: jest.fn() }));
jest.mock('../src/services/ai.service', () => ({ ...jest.requireActual('../src/services/ai.service'), isConfigured: () => true, complete: jest.fn() }));

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../src/app');
const tmdb = require('../src/services/tmdb.service');
const ai = require('../src/services/ai.service');
const User = require('../src/models/User');

let mongod;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // unique indexes (duplicate plan / duplicate report) must exist before the tests rely on them
  await Promise.all(['Plan', 'Report', 'Review', 'UserMovie', 'WatchProgress', 'User'].map((m) => require(`../src/models/${m}`).init()));
});
afterAll(async () => { await mongoose.disconnect(); if (mongod) await mongod.stop(); });
beforeEach(() => {
  tmdb.get.mockImplementation(async (path) => {
    if (path === '/genre/movie/list') return { genres: [{ id: 28, name: 'Action' }] };
    if (path.startsWith('/movie/')) return { id: 603, title: 'The Matrix', overview: 'A hacker learns the truth.', tagline: 'Free your mind', poster_path: '/m.jpg', genres: [{ id: 28, name: 'Action' }], runtime: 136 };
    return { results: [] };
  });
});

const make = async (name) => {
  const r = await request(app).post('/api/v1/auth/register').send({ name, email: `${name}@x.com`, password: 'password123' });
  return { id: r.body.user.id, h: { Authorization: `Bearer ${r.body.accessToken}` } };
};
const movie = { tmdbId: 603, title: 'The Matrix', posterPath: '/m.jpg', genreIds: [28], runtime: 136, voteAverage: 8.2, releaseDate: '1999-03-30' };

describe('Planner', () => {
  it('creates, blocks duplicates, edits, completes (marks watched), and deletes', async () => {
    const u = await make('planner');
    const c = await request(app).post('/api/v1/planner').set(u.h).send({ ...movie, scheduledFor: '2026-12-01T20:00:00.000Z', note: 'with pizza' });
    expect(c.status).toBe(201);
    expect((await request(app).post('/api/v1/planner').set(u.h).send(movie)).status).toBe(409);
    expect((await request(app).post('/api/v1/planner').set(u.h).send({ tmdbId: 1 })).status).toBe(422);

    const id = c.body.plan._id;
    const e = await request(app).patch(`/api/v1/planner/${id}`).set(u.h).send({ note: 'no pizza', scheduledFor: null });
    expect(e.body.plan.note).toBe('no pizza');

    const done = await request(app).patch(`/api/v1/planner/${id}`).set(u.h).send({ status: 'completed' });
    expect(done.body.plan.status).toBe('completed');
    const watched = await request(app).get('/api/v1/watchlist?status=watched').set(u.h);
    expect(watched.body.items.map((i) => i.tmdbId)).toContain(603);
    expect((await request(app).get('/api/v1/planner?status=completed').set(u.h)).body.items).toHaveLength(1);

    expect((await request(app).delete(`/api/v1/planner/${id}`).set(u.h)).status).toBe(200);
    expect((await request(app).delete(`/api/v1/planner/${id}`).set(u.h)).status).toBe(404);
  });
  it("cannot touch someone else's plan", async () => {
    const a = await make('pa'); const b = await make('pb');
    const c = await request(app).post('/api/v1/planner').set(a.h).send(movie);
    expect((await request(app).patch(`/api/v1/planner/${c.body.plan._id}`).set(b.h).send({ note: 'x' })).status).toBe(404);
  });
});

describe('Spoiler-safe discussions + moderation', () => {
  it('redacts spoilers on the server, reveals on request, auto-hides after reports, admin resolves', async () => {
    const [author, reader, r2, r3, r4] = await Promise.all(['dauthor', 'dreader', 'drep2', 'drep3', 'drep4'].map(make));
    const posted = await request(app).post('/api/v1/discussions/603/comments').set(author.h).send({ content: 'He was dead all along', isSpoiler: true, movieTitle: 'The Matrix' });
    expect(posted.status).toBe(201);
    const cid = posted.body.id;

    const mineView = await request(app).get('/api/v1/discussions/603').set(author.h);
    expect(mineView.body.items[0].content).toBe('He was dead all along');
    const view = await request(app).get('/api/v1/discussions/603').set(reader.h);
    expect(view.body.items[0].redacted).toBe(true);
    expect(view.body.items[0].content).toBeNull();
    expect(JSON.stringify(view.body)).not.toMatch(/dead all along/);

    expect((await request(app).get(`/api/v1/discussions/comments/${cid}/reveal`).set(reader.h)).body.content).toBe('He was dead all along');

    await request(app).put('/api/v1/discussions/603/progress').set(reader.h).send({ status: 'finished' });
    expect((await request(app).get('/api/v1/discussions/603').set(reader.h)).body.items[0].content).toBe('He was dead all along');

    const reply = await request(app).post('/api/v1/discussions/603/comments').set(reader.h).send({ content: 'Great point', parent: cid });
    expect(reply.status).toBe(201);
    expect((await request(app).get('/api/v1/discussions/603').set(author.h)).body.items[0].replies).toHaveLength(1);

    expect((await request(app).post(`/api/v1/discussions/comments/${cid}/report`).set(author.h).send({ reason: 'spam' })).status).toBe(400); // own content
    for (const u of [r2, r3, r4]) expect((await request(app).post(`/api/v1/discussions/comments/${cid}/report`).set(u.h).send({ reason: 'harassment' })).status).toBe(201);
    expect((await request(app).post(`/api/v1/discussions/comments/${cid}/report`).set(r2.h).send({ reason: 'spam' })).status).toBe(409);
    const hiddenView = await request(app).get('/api/v1/discussions/603').set(reader.h);
    expect(hiddenView.body.items[0].hidden).toBe(true);
    expect(hiddenView.body.items[0].content).toBeNull();

    // admin side
    const admin = await make('dadmin');
    await User.updateOne({ _id: admin.id }, { role: 'admin' });
    expect((await request(app).get('/api/v1/admin/reports').set(reader.h)).status).toBe(403);
    const list = await request(app).get('/api/v1/admin/reports').set(admin.h);
    expect(list.body.items.length).toBeGreaterThanOrEqual(3);
    expect(list.body.items[0].target.text).toBe('He was dead all along');
    const rid = list.body.items[0].id;
    expect((await request(app).patch(`/api/v1/admin/reports/${rid}`).set(admin.h).send({ action: 'delete' })).status).toBe(200);
    expect((await request(app).get('/api/v1/discussions/603').set(reader.h)).body.items).toHaveLength(0);
    expect((await request(app).get('/api/v1/admin/reports').set(admin.h)).body.items).toHaveLength(0);
  });
});

describe('Admin RBAC and analytics', () => {
  it('blocks normal users and lets admins manage accounts', async () => {
    const user = await make('plain'); const admin = await make('boss'); const victim = await make('victim');
    await User.updateOne({ _id: admin.id }, { role: 'admin' });
    for (const p of ['analytics', 'ai-usage', 'users', 'reviews', 'reports']) expect((await request(app).get(`/api/v1/admin/${p}`).set(user.h)).status).toBe(403);
    expect((await request(app).get('/api/v1/admin/users')).status).toBe(401);

    const an = await request(app).get('/api/v1/admin/analytics').set(admin.h);
    expect(an.status).toBe(200);
    expect(an.body.totals.users).toBeGreaterThan(3);
    expect(an.body.signups).toHaveLength(14);
    expect((await request(app).get('/api/v1/admin/ai-usage').set(admin.h)).body.totals).toHaveProperty('successRate');
    expect((await request(app).get('/api/v1/admin/users?search=victim').set(admin.h)).body.items).toHaveLength(1);

    expect((await request(app).patch(`/api/v1/admin/users/${admin.id}`).set(admin.h).send({ isActive: false })).status).toBe(400); // not yourself
    expect((await request(app).patch(`/api/v1/admin/users/${victim.id}`).set(admin.h).send({ isActive: false })).status).toBe(200);
    expect((await request(app).get('/api/v1/auth/me').set(victim.h)).status).toBe(401); // suspended accounts lose access
  });
});

describe('Story simulator', () => {
  it('creates a labelled story, continues it, and ends at the cap', async () => {
    const u = await make('writer');
    ai.complete.mockResolvedValue('{"narrative":"Neo hesitates.","choices":["Take the blue pill","Take the red pill","Walk away"]}');
    const c = await request(app).post('/api/v1/stories').set(u.h).send({ tmdbId: 603, whatIf: 'What if Neo said no?', spoilerLevel: 'none' });
    expect(c.status).toBe(201);
    expect(c.body.story.label).toMatch(/Unofficial, AI-generated/);
    expect(c.body.story.segments).toHaveLength(1);
    expect(ai.complete.mock.calls[0][0].prompt).toMatch(/SPOILER-FREE/);

    let story = c.body.story;
    expect((await request(app).post(`/api/v1/stories/${story._id}/choose`).set(u.h).send({})).status).toBe(422);
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post(`/api/v1/stories/${story._id}/choose`).set(u.h).send(i === 0 ? { choiceIndex: 1 } : { custom: 'Something unexpected' });
      expect(r.status).toBe(200);
      story = r.body.story;
    }
    expect(story.status).toBe('ended');
    expect(story.segments).toHaveLength(6);
    expect(story.segments[0].chosen).toBe('Take the red pill');
    expect((await request(app).post(`/api/v1/stories/${story._id}/choose`).set(u.h).send({ choiceIndex: 0 })).status).toBe(409);
    expect((await request(app).get('/api/v1/stories').set(u.h)).body.items[0].parts).toBe(6);

    const other = await make('snoop');
    expect((await request(app).get(`/api/v1/stories/${story._id}`).set(other.h)).status).toBe(404);
  });
  it('reports a clean error when the AI output is unreadable', async () => {
    const u = await make('writer2');
    ai.complete.mockResolvedValue('sorry, no JSON here');
    const r = await request(app).post('/api/v1/stories').set(u.h).send({ tmdbId: 603, whatIf: 'What if everything changed?' });
    expect(r.status).toBe(502);
  });
});

describe('Movie DNA', () => {
  it('aggregates watched movies, ratings and months', async () => {
    const u = await make('dnauser');
    await request(app).put('/api/v1/watchlist/603').set(u.h).send({ title: 'The Matrix', genreIds: [28], watched: true });
    await request(app).put('/api/v1/reviews/movie/603').set(u.h).send({ movieTitle: 'The Matrix', rating: 9 });
    const r = await request(app).get('/api/v1/analytics/dna').set(u.h);
    expect(r.body.totalWatched).toBe(1);
    expect(r.body.favoriteGenres[0]).toMatchObject({ id: 28, name: 'Action', count: 1 });
    expect(r.body.ratingsDistribution[8].count).toBe(1);
    expect(r.body.monthlyActivity).toHaveLength(12);
    expect(r.body.monthlyActivity[11].count).toBe(1);
    expect(r.body.averageRating).toBe(9);
    expect(r.body.insights.length).toBeGreaterThan(0);
    expect((await request(app).get('/api/v1/analytics/compatibility').set(u.h)).body.friends).toEqual([]);
  });
});
