const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Groups Routes', () => {
  let adminUser;
  let adminToken;
  let studentUser;
  let createdGroupId;
  let pendingGroupRequestId;

  beforeEach(async () => {
    // 1. Crear Admin User (para operaciones protegidas)
    adminUser = await prisma.user.create({
      data: {
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@groups.test',
        auth0_id: 'auth0|admin-groups',
        role: 'ADMIN',
        phone: '99999999',
        student_number: 'ADM001',
        career: 'Admin'
      }
    });
    adminToken = `Bearer user-json:${JSON.stringify({ sub: adminUser.auth0_id, email: adminUser.email })}`;

    // 2. Crear Student User (Representante)
    studentUser = await prisma.user.create({
      data: {
        first_name: 'Student',
        last_name: 'Repre',
        email: 'student@groups.test',
        auth0_id: 'auth0|student-groups',
        role: 'STUDENT',
        phone: '11111111',
        student_number: 'STD001',
        career: 'Ingeniería'
      }
    });

    // 3. Crear una Solicitud de Grupo CONFIRMADA (para crear el grupo existente)
    const gr1 = await prisma.groupRequest.create({
      data: {
        user_id: studentUser.id,
        name: 'Existing Group Request',
        goal: 'Study',
        status: 'CONFIRMED'
      }
    });

    // 4. Crear el Grupo asociado
    const group = await prisma.group.create({
      data: {
        group_request_id: gr1.id,
        repre_id: studentUser.id,
        reputation: 5.0
      }
    });
    createdGroupId = group.id;

    // 5. Crear otra Solicitud de Grupo CONFIRMADA (para el test POST)
    const gr2 = await prisma.groupRequest.create({
      data: {
        user_id: studentUser.id,
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
    // Debe haber al menos el que creamos
    expect(res.body.some(g => g.id === createdGroupId)).toBe(true);
  });

  it('GET /api/groups/:id - debería devolver un group específico', async () => {
    const res = await request(app).get(`/api/groups/${createdGroupId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdGroupId);
    expect(res.body).toHaveProperty('repre_id', studentUser.id);
  });

  it('POST /api/groups - debería crear un nuevo group (requiere Admin)', async () => {
    const newGroup = {
      repre_id: studentUser.id,
      group_request_id: pendingGroupRequestId,
      moderators_ids: [],
      reputation: 5
    };
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', adminToken) // Usar token de admin
      .send(newGroup);

    if (res.status !== 201) console.error('POST Error:', res.body);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('repre_id', studentUser.id);
  });

  it('DELETE /api/groups/:id - debería eliminar un group (requiere Admin)', async () => {
    const res = await request(app)
      .delete(`/api/groups/${createdGroupId}`)
      .set('Authorization', adminToken); // Usar token de admin
    expect(res.status).toBe(204);
  });
});