const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// Rutas de ejemplo (luego las moveremos a /routes)
app.get('/', (_req, res) => {
  res.json({ message: 'API de agendamiento de salas 🚀' });
});

module.exports = app;
