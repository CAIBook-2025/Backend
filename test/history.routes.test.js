const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('History Routes', () => {
  let userId = 1; // Default mock user from setup.js
  let srId;

  beforeEach(async () => {
    // 1. Asegurar que User 1 existe (setup.js lo crea)
    // Promover a ADMIN para probar rutas protegidas de admin también
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' }
    });

    // 2. Crear Sala de Estudio
    const sr = await prisma.studyRoom.create({
      data: {
        name: 'History Test Room',
        location: 'Library',
        capacity: 5
      }
    });
    srId = sr.id;

    // 3. Crear Reserva para historial de salas
    await prisma.sRScheduling.create({
      data: {
        sr_id: srId,
        user_id: userId,
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
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(res.status).toBe(200);
      expect(res.body.studyRooms).toHaveLength(1);
      expect(res.body.studyRooms[0].studyRoom.id).toBe(srId);
    });
  });

  describe('GET /api/history/groups-created', () => {
    it('debería devolver historial de grupos (req ADMIN)', async () => {
      // Crear datos necesarios: GroupRequest, Group
      const gr = await prisma.groupRequest.create({
        data: {
          user_id: userId,
          name: 'History Group',
          goal: 'Test',
          status: 'CONFIRMED'
        }
      });

      await prisma.group.create({
        data: {
          group_request_id: gr.id,
          repre_id: userId,
          reputation: 5.0
        }
      });

      const res = await request(app)
        .get('/api/history/groups-created')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(res.status).toBe(200);
      expect(res.body.groups).toHaveLength(1);
    });
  });
});
