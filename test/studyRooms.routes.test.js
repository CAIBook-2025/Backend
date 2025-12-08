const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Study Rooms Routes', () => {
  let createdRoomId;
  let userId = 1;

  beforeEach(async () => {
    // 1. Promover a ADMIN
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
  });

  it('GET /api/sRooms - debería devolver todas las study rooms', async () => {
    const res = await request(app).get('/api/sRooms');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/sRooms/:id - debería devolver una study room específica', async () => {
    const res = await request(app).get(`/api/sRooms/${createdRoomId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdRoomId);
  });

  it('POST /api/sRooms - debería crear una nueva study room', async () => {
    const newStudyRoom = {
      name: 'Sala de estudio A',
      capacity: 10,
      location: 'Edificio B',
      equipment: ['Proyector', 'WiFi']
    };
    const res = await request(app)
      .post('/api/sRooms')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(newStudyRoom);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Sala de estudio A');
  });

  it('PATCH /api/sRooms/:id - debería actualizar una study room', async () => {
    const updatedStudyRoom = {
      name: 'Sala actualizada',
      capacity: 15
    };
    const res = await request(app)
      .patch(`/api/sRooms/${createdRoomId}`)
      .set('Authorization', 'Bearer valid-jwt-token') // Added Auth
      .send(updatedStudyRoom);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Sala actualizada');
  });

  it('DELETE /api/sRooms/:id - debería eliminar una study room', async () => {
    const res = await request(app)
      .delete(`/api/sRooms/${createdRoomId}`)
      .set('Authorization', 'Bearer valid-jwt-token'); // Added Auth
    expect([200, 204]).toContain(res.status);
  });
});