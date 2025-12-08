const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Groups Routes', () => {
  let createdGroupId;
  // let createdGroupRequestId;
  let userId = 1; // From setup.js
  let pendingGroupRequestId;

  beforeEach(async () => {
    // 1. Promover Usuario a ADMIN (Crear/Eliminar requiere ADMIN)
    // Setup.js crea el usuario con ID 1 como STUDENT. Lo actualizamos aquí.
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' }
    });

    // 2. Crear una Solicitud de Grupo para el Grupo existente
    const gr1 = await prisma.groupRequest.create({
      data: {
        user_id: userId,
        name: 'Existing Group Request',
        goal: 'Study',
        status: 'CONFIRMED'
      }
    });
    // createdGroupRequestId = gr1.id;

    // 3. Crear el Grupo
    const group = await prisma.group.create({
      data: {
        group_request_id: gr1.id,
        repre_id: userId,
        reputation: 5.0
      }
    });
    createdGroupId = group.id;

    // 4. Crear otra Solicitud de Grupo para el test POST
    const gr2 = await prisma.groupRequest.create({
      data: {
        user_id: userId,
        name: 'New Group Request',
        goal: 'Study More',
        status: 'CONFIRMED'
      }
    });
    pendingGroupRequestId = gr2.id;
  });

  it('GET /api/groups - debería devolver todos los groups', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/groups/:id - debería devolver un group específico', async () => {
    const res = await request(app).get(`/api/groups/${createdGroupId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdGroupId);
  });

  it('POST /api/groups - debería crear un nuevo group', async () => {
    const newGroup = {
      repre_id: userId,
      group_request_id: pendingGroupRequestId,
      moderators_ids: [],
      reputation: 5
    };
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(newGroup);

    if (res.status !== 201) console.error('POST Error:', res.body);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('DELETE /api/groups/:id - debería eliminar un group', async () => {
    const res = await request(app)
      .delete(`/api/groups/${createdGroupId}`)
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(204);
  });
});