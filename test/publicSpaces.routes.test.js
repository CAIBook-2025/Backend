const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Public Spaces Routes', () => {
  let createdSpaceId;
  let adminUser, adminToken;

  beforeEach(async () => {
    // 1. Crear Admin
    adminUser = await prisma.user.create({
      data: {
        first_name: 'Admin',
        last_name: 'Space',
        email: 'admin.space@test.com',
        auth0_id: 'auth0|admin-space',
        role: 'ADMIN',
        phone: '12345678',
        student_number: 'ADM-SPC',
        career: 'Admin'
      }
    });
    adminToken = `Bearer user-json:${JSON.stringify({ sub: adminUser.auth0_id, email: adminUser.email })}`;

    // 2. Crear Espacio Público
    const ps = await prisma.publicSpace.create({
      data: {
        name: 'Seed Public Space',
        capacity: 100,
        location: 'Building A',
        available: 'AVAILABLE'
      }
    });
    createdSpaceId = ps.id;
  });

  it('GET /api/public-spaces - debería devolver todos los public spaces', async () => {
    const res = await request(app).get('/api/public-spaces'); // Public?
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/public-spaces/:id - debería devolver un public space específico', async () => {
    const res = await request(app).get(`/api/public-spaces/${createdSpaceId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdSpaceId);
  });

  it('POST /api/public-spaces - debería crear un nuevo public space', async () => {
    const newPublicSpace = {
      name: 'Auditorio Principal',
      capacity: 200,
      location: 'Edificio A, Piso 1',
      available: 'AVAILABLE'
    };
    const res = await request(app)
      .post('/api/public-spaces')
      .set('Authorization', adminToken)
      .send(newPublicSpace);

    if (res.status !== 201) console.error('POST Error:', res.body);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Auditorio Principal');
  });

  it('PATCH /api/public-spaces/:id - debería actualizar un public space', async () => {
    const updatedPublicSpace = {
      name: 'Auditorio Actualizado',
      capacity: 250
    };
    const res = await request(app)
      .patch(`/api/public-spaces/${createdSpaceId}`)
      .set('Authorization', adminToken)
      .send(updatedPublicSpace);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdSpaceId);
  });

  it('DELETE /api/public-spaces/:id - debería eliminar un public space', async () => {
    const res = await request(app)
      .delete(`/api/public-spaces/${createdSpaceId}`)
      .set('Authorization', adminToken);
    // Expect 200 or 204
    expect([200, 204]).toContain(res.status);
  });
});