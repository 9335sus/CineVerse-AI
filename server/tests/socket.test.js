process.env.NODE_ENV = 'test';
const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const { io: Client } = require('socket.io-client');
const app = require('../src/app');
const initSockets = require('../src/sockets');
const Room = require('../src/models/Room');

let mongod, server, port, ioServer;
const clients = [];
const wait = (socket, ev) => new Promise((r) => socket.once(ev, r));
const connect = (token) => {
  const s = Client(`http://localhost:${port}`, { auth: { token }, transports: ['websocket'], forceNew: true });
  clients.push(s);
  return s;
};
const emit = (s, ev, data) => new Promise((r) => s.emit(ev, data, r));

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  server = http.createServer(app);
  ioServer = initSockets(server);
  app.set('io', ioServer);
  await new Promise((r) => server.listen(0, r));
  port = server.address().port;
});
afterAll(async () => {
  clients.forEach((c) => c.close());
  ioServer.close();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

const register = async (name) => (await request(app).post('/api/v1/auth/register').send({ name, email: `${name}@x.com`, password: 'password123' })).body;

describe('CineSync sockets', () => {
  it('rejects unauthenticated sockets', async () => {
    const s = connect('bad');
    const err = await wait(s, 'connect_error');
    expect(err.message).toMatch(/Authentication/);
  });

  it('shows presence, blocks non-members, and broadcasts live votes', async () => {
    const a = await register('alice');
    const b = await register('bobby');
    const c = await register('carol');
    const created = await request(app).post('/api/v1/rooms').set('Authorization', `Bearer ${a.accessToken}`).send({ name: 'Friday night' });
    const code = created.body.room.code;
    await request(app).post('/api/v1/rooms/join').set('Authorization', `Bearer ${b.accessToken}`).send({ code });

    const sa = connect(a.accessToken); const sb = connect(b.accessToken); const sc = connect(c.accessToken);
    expect((await emit(sa, 'room:join', { code })).ok).toBe(true);
    const presence = wait(sa, 'room:presence');
    expect((await emit(sb, 'room:join', { code })).ok).toBe(true);
    expect(await presence).toHaveLength(2);
    expect((await emit(sc, 'room:join', { code })).ok).toBe(false); // carol is not a member

    // seed recommendations + open voting, then vote over the socket
    await Room.updateOne({ code }, { status: 'voting', recommendations: [{ tmdbId: 603, title: 'The Matrix', groupScore: 80 }] });
    const updated = wait(sa, 'room:updated');
    expect((await emit(sb, 'room:vote', { code, tmdbId: 603 })).ok).toBe(true);
    const room = await updated;
    expect(room.votes).toHaveLength(1);
    expect(room.votes[0].tmdbId).toBe(603);
  });
});
