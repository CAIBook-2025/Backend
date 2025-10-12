const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

// Routers
//comment trial added

const roomsRouter = require('./routes/studyRooms.routes');
const schedulesRouter = require('./routes/schedule.routes');
const strikesRouter = require('./routes/strikes.routes');
const attendanceRouter = require('./routes/attendance.routes');
const groupsRouter = require('./routes/groups.routes');
const eventsRouter = require('./routes/events.routes');
const publicSpacesRouter = require('./routes/publicSpaces.routes');
const eventRequestsRouter = require('./routes/eventRequests.routes');
const groupRequestsRouter = require('./routes/groupRequests.routes');
const userRouter = require('./routes/user.routes');

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
app.use('/api/users', userRouter);
app.use('/api/sRooms', roomsRouter);
app.use('/api/srSchedule', schedulesRouter);
app.use('/api/strikes', strikesRouter);

// JWT error handler
app.use((err, _req, res, _next) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Error handler global
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;