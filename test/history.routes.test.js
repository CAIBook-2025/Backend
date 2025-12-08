const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('History Routes', () => {
  let adminUser, adminToken;
  let studentUser, studentToken;
  let srId;

  beforeEach(async () => {
    // 1. Crear Admin (para history/groups-created)
    adminUser = await prisma.user.create({
      data: {
        first_name: 'Admin',
        last_name: 'History',
        email: 'admin.history@test.com',
        auth0_id: 'auth0|admin-history',
        role: 'ADMIN',
        phone: '12345678',
        student_number: 'ADM-HIS',
        career: 'Admin'
      }
    });
    adminToken = `Bearer user-json:${JSON.stringify({ sub: adminUser.auth0_id, email: adminUser.email })}`;

    // 2. Crear Student (para history/study-rooms)
    studentUser = await prisma.user.create({
      data: {
        first_name: 'Student',
        last_name: 'History',
        email: 'student.history@test.com',
        auth0_id: 'auth0|student-history',
        role: 'STUDENT',
        phone: '87654321',
        student_number: 'STD-HIS',
        career: 'Ingeniería'
      }
    });
    studentToken = `Bearer user-json:${JSON.stringify({ sub: studentUser.auth0_id, email: studentUser.email })}`;

    // 3. Crear Sala de Estudio
    const sr = await prisma.studyRoom.create({
      data: {
        name: 'History Test Room',
        location: 'Library',
        capacity: 5
      }
    });
    srId = sr.id;

    // 4. Crear Reserva para historial de salas (del estudiante)
    await prisma.sRScheduling.create({
      data: {
        sr_id: srId,
        user_id: studentUser.id,
        day: new Date(),
        module: 1,
        status: 'PRESENT',
        is_finished: true
      }
    });
  });

  describe('GET /api/history/study-rooms', () => {
    it('debería devolver el historial de reservas', async () => {
      const res = await request(app)
        .get('/api/history/study-rooms')
        .set('Authorization', studentToken);

      expect(res.status).toBe(200);
      expect(res.body.studyRooms).toHaveLength(1);
      expect(res.body.studyRooms[0].studyRoom.id).toBe(srId);
    });
  });

  describe('GET /api/history/groups-created', () => {
    it('debería devolver historial de grupos (req ADMIN)', async () => {
      // Crear datos necesarios: GroupRequest, Group (using Admin as creator/approver context)
      const gr = await prisma.groupRequest.create({
        data: {
          user_id: adminUser.id, // Admin created this request? Or someone else.
          name: 'History Group',
          goal: 'Test',
          status: 'CONFIRMED'
        }
      });

      await prisma.group.create({
        data: {
          group_request_id: gr.id,
          repre_id: adminUser.id,
          reputation: 5.0
        }
      });

      const res = await request(app)
        .get('/api/history/groups-created')
        .set('Authorization', adminToken);

      expect(res.status).toBe(200);
      expect(res.body.groups).toHaveLength(1);
    });
  });
});
