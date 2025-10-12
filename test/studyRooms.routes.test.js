const request = require('supertest');
const app = require('../src/app'); 

describe('Study Rooms Routes', () => {
  it('GET /api/sRooms - debería devolver todas las study rooms', async () => {
    const res = await request(app).get('/api/sRooms');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /api/sRooms/:id - debería devolver una study room específica', async () => {
    const res = await request(app).get('/api/sRooms/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /study-rooms - debería crear una nueva study room', async () => {
    const newStudyRoom = {
      name: "Sala de estudio A",
      capacity: 10,
      availability: true,
      resources: "Proyector, WiFi"
    };
    const res = await request(app).post('/api/sRooms').send(newStudyRoom);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Sala de estudio A');
  });

  it('PATCH /api/sRooms/:id - debería actualizar una study room', async () => {
    const updatedStudyRoom = {
      name: "Sala actualizada",
      capacity: 15
    };
    const res = await request(app).patch('/api/sRooms/1').send(updatedStudyRoom);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Sala actualizada');
  });

  it('DELETE /api/sRooms/:id - debería eliminar una study room', async () => {
    const res = await request(app).delete('/api/sRooms/1');
    expect(res.status).toBe(204);
  });
});