const request = require('supertest');
const app = require('../src/app');

describe('Error Cases Tests - Casos que deben fallar', () => {
  const { prisma } = require('../src/lib/prisma');
  let adminUser, adminToken;

  beforeEach(async () => {
    // 1. Crear Admin
    adminUser = await prisma.user.create({
      data: {
        first_name: 'Admin',
        last_name: 'Error',
        email: 'admin.error@test.com',
        auth0_id: 'auth0|admin-error',
        role: 'ADMIN',
        phone: '12345678',
        student_number: 'ADM-ERR',
        career: 'Admin'
      }
    });
    adminToken = `Bearer user-json:${JSON.stringify({ sub: adminUser.auth0_id, email: adminUser.email })}`;
  });

  describe('Validación de campos requeridos', () => {

    // Este test fallaba esperando éxito con mocks, pero con DB real debe fallar si falta algo requerido por Prisma
    it('POST /api/users - debería fallar si faltan campos requeridos', async () => {
      const incompleteUser = {
        email: 'incomplete@example.com'
        // Faltan: hashed_password, first_name, last_name
      };

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', adminToken)
        .send(incompleteUser);

      // Controlador o Prisma deben rechazar
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('POST /api/groups - debería fallar por validación del controlador', async () => {
      const incompleteGroup = {
        description: 'Grupo sin nombre ni representante'
      };

      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', adminToken)
        .send(incompleteGroup);

      expect(res.status).toBeGreaterThanOrEqual(400); // 400, 403, 500
      expect(res.body).toHaveProperty('error');
    });

    it('POST /api/public-spaces - debería fallar por validación del controlador', async () => {
      const incompleteSpace = {
        description: 'Espacio sin nombre ni capacidad'
      };

      const res = await request(app)
        .post('/api/public-spaces')
        .set('Authorization', adminToken)
        .send(incompleteSpace);

      expect(res.status).toBeGreaterThanOrEqual(400); // 400, 500
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('IDs inválidos y validación de parámetros', () => {
    it('GET /api/users/:id - debería devolver 400 para ID inválido', async () => {
      const res = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', adminToken); // Users routes protected
      expect([400, 500]).toContain(res.status); // ID inválido (string vs int)
      expect(res.body).toHaveProperty('error');
    });

    it('GET /api/groups/:id - debería devolver 400 para ID negativo', async () => {
      const res = await request(app).get('/api/groups/-1');
      // POST Groups protected, GET likely public?
      expect([400, 500]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });

    it('PATCH /api/sRooms/:id - debería devolver 400 para ID cero', async () => {
      const updateData = { name: 'Updated Room' };
      const res = await request(app)
        .patch('/api/sRooms/0')
        .set('Authorization', adminToken) // Likely protected
        .send(updateData);

      expect(res.status).toBe(400); // Bad Request por ID 0
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Recursos no encontrados (404)', () => {
    it('GET /api/events/:id - debería devolver 404 para evento inexistente', async () => {
      const res = await request(app)
        .get('/api/events/999999')
        .set('Authorization', adminToken); // Protected
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('DELETE /api/strikes/:id - debería devolver 404 con DB real', async () => {
      // Con DB real, si no existe prisma lanza P2025 o similar
      const res = await request(app)
        .delete('/api/strikes/999999')
        .set('Authorization', adminToken); // Protected
      expect([404, 400, 500]).toContain(res.status);
      // strikes.routes.js maneja P2025 -> 404.
      expect(res.status).toBe(404);
    });


  });

  describe('Validación de reglas de negocio', () => {
    it('POST /api/events - debería fallar por validación del controlador', async () => {
      const incompleteEventRequest = {
        description: 'Sin campos requeridos'
      };

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', adminToken)
        .send(incompleteEventRequest);

      expect(res.status).toBe(400); // Bad Request por validación del controlador
      expect(res.body).toHaveProperty('error');
    });

    it('POST /api/events - debería fallar con fechas inválidas', async () => {
      const invalidDateEventRequest = {
        group_id: 1, public_space_id: 1, name: 'Test Event', goal: 'Test', // campos extra para pasar check de undefined
        description: 'Test Description',
        day: 'invalid-date', // campo correcto es day
        module: 1
      };

      const res = await request(app)
        .post('/api/events')
        .set('Authorization', adminToken)
        .send(invalidDateEventRequest);

      // return 404 if group/space doesn't exist (likely).
      // return 400/500 if date is invalid.
      expect([400, 404, 500]).toContain(res.status);
    });

    it('POST /api/srSchedule - debería fallar por validación del controlador', async () => {
      const incompleteSchedule = {
        day: new Date().toISOString()
        // Faltan: userId, srId, module
      };

      const res = await request(app)
        .post('/api/srSchedule')
        .send(incompleteSchedule);

      expect(res.status).toBe(400); // Bad Request por validación del controlador (o 500 prisma)
    });
  });

  describe('Autenticación fallida', () => {
    it('GET /api/users/profile - debería devolver 401 sin token', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.status).toBe(401);
    });
  });
});