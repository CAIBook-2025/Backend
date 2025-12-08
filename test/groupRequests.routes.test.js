const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Group Requests Routes', () => {
  let createdRequestId;
  let userId = 1;

  beforeEach(async () => {
    // 1. Promover Usuario a ADMIN (Opcional, pero bueno para consistencia)
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' }
    });

    // 2. Crear una Solicitud de Grupo
    const req = await prisma.groupRequest.create({
      data: {
        user_id: userId,
        name: 'Seed Group Request',
        goal: 'Seed Goal',
        description: 'Seed Description'
      }
    });
    createdRequestId = req.id;
  });

  it('GET /api/group-requests - debería devolver todas las group requests', async () => {
    const res = await request(app)
      .get('/api/group-requests')
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/group-requests/:id - debería devolver una group request específica', async () => {
    const res = await request(app)
      .get(`/api/group-requests/${createdRequestId}`)
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdRequestId);
  });

  it('POST /api/group-requests - debería crear una nueva group request', async () => {
    const newGroupRequest = {
      name: 'Grupo de estudio',
      goal: 'Preparar examen de matemáticas',
      description: 'Grupo para estudiar juntos'
    };
    const res = await request(app)
      .post('/api/group-requests')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(newGroupRequest);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Grupo de estudio');
  });

  it('PATCH /api/group-requests/:id - debería actualizar una group request', async () => {
    const updatedGroupRequest = {
      name: 'Grupo actualizado',
      description: 'Nueva descripción del grupo'
    };
    const res = await request(app)
      .patch(`/api/group-requests/${createdRequestId}`)
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(updatedGroupRequest);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Grupo actualizado');
  });

  it('DELETE /api/group-requests/:id - debería eliminar una group request', async () => {
    const res = await request(app)
      .delete(`/api/group-requests/${createdRequestId}`)
      .set('Authorization', 'Bearer valid-jwt-token');
    // Usually DELETE returns 200/204
    if (res.status !== 204 && res.status !== 200) {
      console.error('DELETE Error:', res.body);
    }
    // Check for success (either 200 or 204 depending on implementation)
    expect([200, 204]).toContain(res.status);
  });
});