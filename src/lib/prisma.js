// src/lib/prisma.js
const { PrismaClient } = require('../generated/prisma'); // Max: tuve que cambiar esta ruta para que me pescara la db, si no funciona, chequear esto

let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({ log: ['error'] });
} else {
  // Evita crear múltiples clientes en dev (nodemon)
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({ log: ['query', 'warn', 'error'] });
  }
  prisma = global.__prisma;
}

module.exports = { prisma };
