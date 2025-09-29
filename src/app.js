const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

// Routers
const groupsRouter = require('./routes/groups');
const eventsRouter = require('./routes/events');
const publicSpacesRouter = require('./routes/publicSpaces');
const eventRequestsRouter = require('./routes/eventRequests');
const groupRequestsRouter = require('./routes/groupRequests');

const app = express();

// Middlewares base
app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// Home
app.get('/', (_req, res) => {
  res.json({ message: 'API de agendamiento de salas 🚀' });
});

// Routers
app.use('/api/groups', groupsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/public-spaces', publicSpacesRouter);
app.use('/api/event-requests', eventRequestsRouter);
app.use('/api/group-requests', groupRequestsRouter);

// Error handler global
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;