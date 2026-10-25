const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const initSockets = require('./sockets');
const { port } = require('./config/env');

(async () => {
  await connectDB();
  const server = http.createServer(app);
  app.set('io', initSockets(server));
  server.listen(port, () => console.log(`API + sockets running on http://localhost:${port}/api/v1`));
})().catch((e) => { console.error(e); process.exit(1); });
