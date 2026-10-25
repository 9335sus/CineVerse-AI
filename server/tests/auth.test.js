process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../src/app');

let mongod;
beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri()); });
afterAll(async () => { await mongoose.disconnect(); if (mongod) await mongod.stop(); });

const creds = { name: 'Test User', email: 'test@example.com', password: 'password123' };

describe('Auth', () => {
  it('rejects invalid registration', async () => {
    const r = await request(app).post('/api/v1/auth/register').send({ email: 'bad', password: '1' });
    expect(r.status).toBe(422);
  });
  it('registers, sets refresh cookie, and returns an access token', async () => {
    const r = await request(app).post('/api/v1/auth/register').send(creds);
    expect(r.status).toBe(201);
    expect(r.body.accessToken).toBeTruthy();
    expect(r.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  });
  it('blocks duplicate email', async () => {
    expect((await request(app).post('/api/v1/auth/register').send(creds)).status).toBe(409);
  });
  it('logs in and accesses a protected route', async () => {
    const l = await request(app).post('/api/v1/auth/login').send({ email: creds.email, password: creds.password });
    expect(l.status).toBe(200);
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${l.body.accessToken}`);
    expect(me.body.user.email).toBe(creds.email);
  });
  it('refreshes the session using the cookie', async () => {
    const l = await request(app).post('/api/v1/auth/login').send({ email: creds.email, password: creds.password });
    const r = await request(app).post('/api/v1/auth/refresh').set('Cookie', l.headers['set-cookie']);
    expect(r.status).toBe(200);
    expect(r.body.accessToken).toBeTruthy();
  });
  it('rejects protected route without token', async () => {
    expect((await request(app).get('/api/v1/watchlist')).status).toBe(401);
  });
});

describe('Watchlist', () => {
  it('adds, lists, and removes a movie', async () => {
    const l = await request(app).post('/api/v1/auth/login').send({ email: creds.email, password: creds.password });
    const h = { Authorization: `Bearer ${l.body.accessToken}` };
    const add = await request(app).put('/api/v1/watchlist/603').set(h).send({ title: 'The Matrix', inWatchlist: true });
    expect(add.body.inWatchlist).toBe(true);
    const list = await request(app).get('/api/v1/watchlist').set(h);
    expect(list.body.items).toHaveLength(1);
    const off = await request(app).put('/api/v1/watchlist/603').set(h).send({ title: 'The Matrix', inWatchlist: false });
    expect(off.body.inWatchlist).toBe(false);
  });
});
