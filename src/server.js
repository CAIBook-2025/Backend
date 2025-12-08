require('dotenv').config();
const app = require('./app');
const { prisma } = require('./lib/prisma');
const { startCheckInVerifier } = require('./jobs/checkInVerifier');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);

  // Iniciar cron-jobs (desactivar con ENABLE_CRON_JOBS=false en tests)
  if (process.env.ENABLE_CRON_JOBS !== 'false') {
    startCheckInVerifier();
  }
});

async function shutdown() {
  console.log('\nShutting down...');
  try { await prisma.$disconnect(); } catch (error) { console.log('Error disconnecting:', error); }
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);