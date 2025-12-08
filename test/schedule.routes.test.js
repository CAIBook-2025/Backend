const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Schedule Routes', () => {
  let createdRoomId;
  let createdScheduleId;
  let adminUser, adminToken;
  let studentUser, studentToken;

  beforeEach(async () => {
    // 1. Crear Admin (para crear horarios)
    adminUser = await prisma.user.create({
      data: {
        first_name: 'Admin',
        last_name: 'Schedule',
        email: 'admin.schedule@test.com',
        auth0_id: 'auth0|admin-schedule',
        role: 'ADMIN',
        phone: '12345678',
        student_number: 'ADM-SCH',
        career: 'Admin'
      }
    });
    adminToken = `Bearer user-json:${JSON.stringify({ sub: adminUser.auth0_id, email: adminUser.email })}`;

    // 2. Crear Student (para reservar)
    studentUser = await prisma.user.create({
      data: {
        first_name: 'Student',
        last_name: 'Schedule',
        email: 'student.schedule@test.com',
        auth0_id: 'auth0|student-schedule',
        role: 'STUDENT',
        phone: '87654321',
        student_number: 'STD-SCH',
        career: 'Ingeniería'
      }
    });
    studentToken = `Bearer user-json:${JSON.stringify({ sub: studentUser.auth0_id, email: studentUser.email })}`;

    // 3. Crear Sala de Estudio
    const sr = await prisma.studyRoom.create({
      data: {
        name: 'Seed Study Room',
        capacity: 10,
        location: 'Library',
        equipment: ['Whiteboard']
      }
    });
    createdRoomId = sr.id;

    // 4. Crear Horario (Schedule)
    const schedule = await prisma.sRScheduling.create({
      data: {
        sr_id: createdRoomId,
        day: new Date('2024-12-01T00:00:00.000Z'),
        module: 1,
        available: 'AVAILABLE',
        status: 'PENDING',
        user_id: null // Disponible para reservar
      }
    });
    createdScheduleId = schedule.id;
  });

  it('GET /api/srSchedule - debería devolver todos los schedule', async () => {
    const res = await request(app).get('/api/srSchedule');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /api/srSchedule/:id - debería devolver un schedule específico', async () => {
    const res = await request(app).get(`/api/srSchedule/${createdScheduleId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdScheduleId);
  });

  it('POST /api/srSchedule - debería crear un nuevo schedule', async () => {
    const newSchedule = {
      srId: createdRoomId,
      day: '2024-12-02T00:00:00.000Z',
      module: 2, // Debe ser Int
      available: 'AVAILABLE'
    };
    // Admin creates schedule
    const res = await request(app)
      .post('/api/srSchedule')
      .set('Authorization', adminToken)
      .send(newSchedule);

    if (res.status !== 201) console.error('POST Error:', res.body);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('sr_id', createdRoomId);
  });

  it('PATCH /api/srSchedule/book - debería reservar un schedule', async () => {
    const reserveData = {
      userId: studentUser.id, // Student IS booking it
      id: createdScheduleId
    };
    // Student requests booking
    const res = await request(app)
      .patch('/api/srSchedule/book')
      .set('Authorization', studentToken)
      .send(reserveData);

    if (res.status !== 200) console.error('PATCH Book Error:', res.body);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdScheduleId);
    expect(res.body.user_id).toBe(studentUser.id);
  });

  it('DELETE /api/srSchedule/:id - debería eliminar un schedule', async () => {
    const res = await request(app)
      .delete(`/api/srSchedule/${createdScheduleId}`)
      .set('Authorization', adminToken);
    expect(res.status).toBe(204);
  });
});