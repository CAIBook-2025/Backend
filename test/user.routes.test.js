const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('User Routes', () => {
  let testUser;
  let validToken;

  beforeEach(async () => {
    // Crear usuario aislado para este test suite
    testUser = await prisma.user.create({
      data: {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        auth0_id: 'auth0|test-user-id',
        role: 'STUDENT',
        phone: '1234567890',
        student_number: 'S12345',
        career: 'Ingeniería'
      }
    });

    // Generar token dinámico para este usuario
    validToken = `Bearer user-json:${JSON.stringify({ sub: testUser.auth0_id, email: testUser.email })}`;
  });

  it('GET /api/users - debería devolver todos los users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', validToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.some(u => u.id === testUser.id)).toBe(true);
  });

  it('GET /api/users/:id - debería devolver un user específico', async () => {
    const res = await request(app)
      .get(`/api/users/${testUser.id}`)
      .set('Authorization', validToken);
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('id', testUser.id);
  });

  it('GET /api/users/profile - debería devolver el perfil del user autenticado', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', validToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('id', testUser.id);
  });

  it('POST /api/users - debería crear un nuevo user', async () => {
    const newUser = {
      first_name: 'Juan',
      last_name: 'Pérez',
      email: 'juan.perez@test.com',
      auth0_id: 'auth0|new-test-user',
      career: 'Ingeniería',
      phone: '+56912345678',
      student_number: '12345678J'
    };
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', validToken)
      .send(newUser);

    if (res.status !== 201) {
      console.error('POST /users error:', res.body);
    }

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('email', 'juan.perez@test.com');
  });

  it('PATCH /api/users/profile - debería actualizar el perfil del user', async () => {
    const updatedUser = {
      first_name: 'Juan Carlos'
    };
    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', validToken)
      .send(updatedUser);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('first_name', 'Juan Carlos');
  });

  it('DELETE /api/users/:id - debería eliminar un user', async () => {
    const res = await request(app)
      .delete(`/api/users/${testUser.id}`)
      .set('Authorization', validToken);
    expect(res.status).toBe(200);

    // Verificar que fue eliminado (soft delete o hard delete, según implementación backend)
    // Asumiendo soft delete o hard delete, buscarlo no debería retornarlo en endpoints públicos o debería estar is_deleted
  });
});