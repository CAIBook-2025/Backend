// src/lib/prisma.js
const { PrismaClient } = require('@prisma/client');

let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({ log: ['error'] });
} else if (process.env.NODE_ENV === 'test') {
  // En test, usamos la URL de test
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL,
      },
    },
    // Menos logs en test para no ensuciar la salida
    log: ['warn', 'error'],
  });
} else {
  // Evita crear múltiples clientes en dev (nodemon)
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({ log: ['query', 'warn', 'error'] });
  }
  prisma = global.__prisma;
}

module.exports = { prisma };
