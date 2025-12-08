const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Group Requests Routes', () => {
  let studentUser, studentToken;
  let adminUser, adminToken;
  let createdRequestId;

  beforeEach(async () => {
    // 1. Crear Student
    studentUser = await prisma.user.create({
      data: {
        first_name: 'Student',
        last_name: 'Request',
        email: 'student.request@test.com',
        auth0_id: 'auth0|student-request',
        role: 'STUDENT',
        phone: '11111111',
        student_number: 'REQ001',
        career: 'Ingeniería'
      }
    });
    studentToken = `Bearer user-json:${JSON.stringify({ sub: studentUser.auth0_id, email: studentUser.email })}`;

    // 2. Crear Admin
    adminUser = await prisma.user.create({
      data: {
        first_name: 'Admin',
        last_name: 'Request',
        email: 'admin.request@test.com',
        auth0_id: 'auth0|admin-request',
        role: 'ADMIN',
        phone: '99999999',
        student_number: 'ADM999',
        career: 'Admin'
      }
    });
    adminToken = `Bearer user-json:${JSON.stringify({ sub: adminUser.auth0_id, email: adminUser.email })}`;

    // 3. Crear una Request inicial
    const req = await prisma.groupRequest.create({
      data: {
        user_id: studentUser.id,
        name: 'Existing Request',
        goal: 'Study Goal',
        status: 'PENDING'
      }
    });
    createdRequestId = req.id;
  });

  it('GET /api/group-requests - debería devolver requests', async () => {
    const res = await request(app)
      .get('/api/group-requests')
      .set('Authorization', studentToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(r => r.id === createdRequestId)).toBe(true);
  });

  it('GET /api/group-requests/:id - debería devolver request específica', async () => {
    const res = await request(app)
      .get(`/api/group-requests/${createdRequestId}`)
      .set('Authorization', studentToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdRequestId);
  });

  it('POST /api/group-requests - debería crear request', async () => {
    const newReq = {
      name: 'New Study Group',
      goal: 'Learn Testing',
      description: 'Unit testing 101'
    };
    const res = await request(app)
      .post('/api/group-requests')
      .set('Authorization', studentToken)
      .send(newReq);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'New Study Group');
    expect(res.body).toHaveProperty('user_id', studentUser.id);
  });

  it('PATCH /api/group-requests/:id - debería actualizar request (propia)', async () => {
    const updateData = {
      name: 'Updated Name Group'
    };
    const res = await request(app)
      .patch(`/api/group-requests/${createdRequestId}`)
      .set('Authorization', studentToken)
      .send(updateData);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Updated Name Group');
  });

  it('PATCH /api/group-requests/:id - Admin confirma request', async () => {
    const res = await request(app)
      .patch(`/api/group-requests/${createdRequestId}`)
      .set('Authorization', adminToken)
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'CONFIRMED');

    // Verificar que el grupo se haya creado automaticamente (lógica de negocio)
    const pendingReqVerify = await request(app)
      .get(`/api/group-requests/${createdRequestId}`)
      .set('Authorization', adminToken);

    expect(pendingReqVerify.body.group).toBeTruthy();
  });

  it('DELETE /api/group-requests/:id - debería eliminar request', async () => {
    const res = await request(app)
      .delete(`/api/group-requests/${createdRequestId}`)
      .set('Authorization', studentToken);
    // Usually DELETE returns 200/204
    if (res.status !== 204 && res.status !== 200) {
      console.error('DELETE Error:', res.body);
    }
    // Check for success (either 200 or 204 depending on implementation)
    expect([200, 204]).toContain(res.status);
  });
});