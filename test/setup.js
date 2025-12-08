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
    if (authHeader === 'Bearer invalid-token') return res.status(401).json({ error: 'Token inválido' });

    // Simula usuario autenticado
    req.auth = { sub: 'test-user-id', email: 'test@example.com' };
    next();
  },
  checkAdmin: (req, res, next) => {
    next();
  }
}));

// ELIMINAMOS los mocks de 'usersService' y 'lib/prisma' para habilitar la integración REAL con la BD.

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

  // 2. Poblar Datos Básicos (Compatible con tests existentes)
  // Muchos tests esperan un Usuario con ID 1 y 'test-user-id'
  await prisma.user.create({
    data: {
      id: 1, // Forzar ID 1
      auth0_id: 'test-user-id',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      phone: '1234567890',
      student_number: 'S12345',
      career: 'Ingeniería',
      role: 'STUDENT',
      // createdAt etc por defecto
    }
  });

  // 3. Reiniciar Secuencia (Arreglo para error de restricción única en ID)
  // Cuando se inserta con ID explícito, la secuencia no se actualiza automáticamente.
  try {
    await prisma.$executeRawUnsafe('ALTER SEQUENCE "User_id_seq" RESTART WITH 2;');
  } catch {
    // Fallback si el nombre de la secuencia implica tabla en minúsculas
    try {
      await prisma.$executeRawUnsafe('ALTER SEQUENCE "user_id_seq" RESTART WITH 2;');
    } catch (e2) {
      console.warn('No se pudo reiniciar la secuencia, los tests podrían fallar si crean usuarios:', e2.message);
    }
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});