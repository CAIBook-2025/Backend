require('dotenv').config();
const app = require('./app');
const { prisma } = require('./lib/prisma');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});

async function shutdown() {
  console.log('\nShutting down...');
  try { await prisma.$disconnect(); } catch {}
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);