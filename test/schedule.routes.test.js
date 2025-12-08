const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Schedule Routes', () => {
  let createdRoomId;
  let createdScheduleId;
  let userId = 1;

  beforeEach(async () => {
    // 1. Promover Usuario a ADMIN (Opcional, pero seguro)
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' }
    });

    // 2. Crear Sala de Estudio
    const sr = await prisma.studyRoom.create({
      data: {
        name: 'Seed Study Room',
        capacity: 10,
        location: 'Library',
        equipment: ['Whiteboard']
      }
    });
    createdRoomId = sr.id;

    // 3. Crear Horario (Schedule)
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
    const res = await request(app).post('/api/srSchedule').send(newSchedule);

    if (res.status !== 201) console.error('POST Error:', res.body);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('sr_id', createdRoomId);
  });

  it('PATCH /api/srSchedule/book - debería reservar un schedule', async () => {
    const reserveData = {
      userId: userId,
      id: createdScheduleId
    };
    const res = await request(app).patch('/api/srSchedule/book').send(reserveData);
    if (res.status !== 200) console.error('PATCH Book Error:', res.body);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdScheduleId);
    expect(res.body.user_id).toBe(userId);
  });

  it('DELETE /api/srSchedule/:id - debería eliminar un schedule', async () => {
    const res = await request(app).delete(`/api/srSchedule/${createdScheduleId}`);
    expect(res.status).toBe(204);
  });
});