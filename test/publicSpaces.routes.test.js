const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Public Spaces Routes', () => {
  let createdSpaceId;
  let userId = 1;

  beforeEach(async () => {
    // 1. Promover a ADMIN (Crear/Eliminar requiere ADMIN)
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' }
    });

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
    const res = await request(app).get('/api/public-spaces');
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
      .set('Authorization', 'Bearer valid-jwt-token')
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
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(updatedPublicSpace);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdSpaceId);
  });

  it('DELETE /api/public-spaces/:id - debería eliminar un public space', async () => {
    const res = await request(app)
      .delete(`/api/public-spaces/${createdSpaceId}`)
      .set('Authorization', 'Bearer valid-jwt-token');
    // Expect 200 or 204
    expect([200, 204]).toContain(res.status);
  });
});