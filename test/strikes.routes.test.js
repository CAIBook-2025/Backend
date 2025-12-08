const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Strikes Routes', () => {
  let createdStrikeId;
  let adminId, adminToken;
  let studentId;

  beforeEach(async () => {
    // 1. Crear Admin
    const admin = await prisma.user.create({
      data: {
        auth0_id: 'auth0|admin-strikes-test',
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin.strikes@test.com',
        phone: '1234567890',
        student_number: 'A0000',
        career: 'Admin',
        role: 'ADMIN'
      }
    });
    adminId = admin.id;
    adminToken = `Bearer user-json:${JSON.stringify({ sub: admin.auth0_id, email: admin.email })}`;

    // 2. Crear Estudiante
    const student = await prisma.user.create({
      data: {
        auth0_id: 'auth0|student-strikes-test',
        first_name: 'Student',
        last_name: 'User',
        email: 'student.strikes@test.com',
        phone: '0987654321',
        student_number: 'S0000',
        career: 'Student',
        role: 'STUDENT'
      }
    });
    studentId = student.id;

    // 3. Crear Strike
    const strike = await prisma.strike.create({
      data: {
        student_id: studentId,
        admin_id: adminId,
        type: 'NO_SHOW',
        description: 'Seed Strike'
      }
    });
    createdStrikeId = strike.id;
  });

  afterEach(async () => {
  });

  it('GET /api/strikes - debería devolver todos los strikes', async () => {
    const res = await request(app)
      .get('/api/strikes')
      .set('Authorization', adminToken); // Auth required usually
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/strikes/:id - debería devolver un strike específico', async () => {
    const res = await request(app)
      .get(`/api/strikes/${createdStrikeId}`)
      .set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdStrikeId);
  });

  it('POST /api/strikes - debería crear un nuevo strike', async () => {
    const newStrike = {
      student_email: 'student.strikes@test.com',
      admin_email: 'admin.strikes@test.com',
      type: 'MISUSE', // Enum válido
      description: 'Incumplimiento de normas'
    };
    const res = await request(app)
      .post('/api/strikes')
      .set('Authorization', adminToken)
      .send(newStrike);

    if (res.status !== 201) console.error('POST Error:', res.body);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('student_id', studentId);
  });

  it('PATCH /api/strikes/:id - debería actualizar un strike', async () => {
    const updatedStrike = {
      description: 'Descripción actualizada',
      type: 'DAMAGE'
    };
    const res = await request(app)
      .patch(`/api/strikes/${createdStrikeId}`)
      .set('Authorization', adminToken)
      .send(updatedStrike);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('type', 'DAMAGE');
  });

  it('DELETE /api/strikes/:id - debería eliminar un strike', async () => {
    const res = await request(app)
      .delete(`/api/strikes/${createdStrikeId}`)
      .set('Authorization', adminToken);
    expect([200, 204]).toContain(res.status);
  });
});