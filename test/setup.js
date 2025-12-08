// test/setup.js
require('dotenv').config();
const { URL } = require('url');

process.env.NODE_ENV = 'test';

// Configurar URL única por worker para evitar colisiones en paralelo
const originalUrl = process.env.TEST_DATABASE_URL;
if (originalUrl) {
  try {
    const url = new URL(originalUrl);
    // JEST_WORKER_ID es asignado por Jest al correr en paralelo (1, 2, ...). Default '1'.
    const workerId = process.env.JEST_WORKER_ID || '1';
    // Asignar schema único: test_worker_1, test_worker_2, etc.
    url.searchParams.set('schema', `test_worker_${workerId}`);
    process.env.TEST_DATABASE_URL = url.toString();
  } catch (error) {
    console.error('Error parseando TEST_DATABASE_URL:', error);
  }
}

const { execSync } = require('child_process');
const { prisma } = require('../src/lib/prisma');

// 1. Mock Middleware de Autenticación (Mantener mocks para servicios externos si es necesario)
jest.mock('../src/middleware/auth', () => ({
  checkJwt: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Formato de token inválido' });

    const token = authHeader.split(' ')[1];

    if (token === 'invalid-token') return res.status(401).json({ error: 'Token inválido' });

    // Soporte para tokens dinámicos de prueba: "Bearer user-json:{"sub":"..."}"
    if (token.startsWith('user-json:')) {
      try {
        const jsonStr = token.replace('user-json:', '');
        req.auth = JSON.parse(jsonStr);
        return next();
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        return res.status(401).json({ error: 'Token de prueba malformado' });
      }
    }

    // Fallback para backward compatibility (si queda algún test sin actualizar)
    // Opcional: Podríamos eliminar esto para forzar que todos usen tokens dinámicos
    if (token === 'valid-jwt-token' || token === 'valid-token') {
      req.auth = { sub: 'test-user-id', email: 'test@example.com' };
      return next();
    }

    // Default mock user if needed, or error
    req.auth = { sub: 'test-user-id', email: 'test@example.com' };
    next();
  },
  checkAdmin: (req, res, next) => {
    next();
  }
}));

// 2. Configuración Global de la BD
beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) {
    console.error('CRITICO: TEST_DATABASE_URL no está definida en .env');
    throw new Error('TEST_DATABASE_URL requerida');
  }

  // Sincronizar Esquema (Migraciones)
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'ignore', // 'inherit' para ver logs de prisma
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL
      }
    });
  } catch (e) {
    console.error('Falló la sincronización del esquema:', e.message);
    throw e;
  }
});

beforeEach(async () => {
  // 1. Limpiar Base de Datos (Borrar todos los datos)
  // Usar current_schema() para respetar el schema configurado en la URL
  const tablenames = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = current_schema()
  `;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"${name}"`)
    .join(', ');

  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`);
  }

});

afterAll(async () => {
  await prisma.$disconnect();
});