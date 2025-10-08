const request = require('supertest');
const app = require('../src/app'); 

describe('Study Rooms Routes', () => {
  it('GET /study-rooms - debería devolver todas las study rooms', async () => {
    const res = await request(app).get('/study-rooms');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /study-rooms/:id - debería devolver una study room específica', async () => {
    const res = await request(app).get('/study-rooms/1');
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
    const res = await request(app).post('/study-rooms').send(newStudyRoom);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Sala de estudio A');
  });

  it('PATCH /study-rooms/:id - debería actualizar una study room', async () => {
    const updatedStudyRoom = {
      name: "Sala actualizada",
      capacity: 15
    };
    const res = await request(app).patch('/study-rooms/1').send(updatedStudyRoom);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Sala actualizada');
  });

  it('DELETE /study-rooms/:id - debería eliminar una study room', async () => {
    const res = await request(app).delete('/study-rooms/1');
    expect(res.status).toBe(204);
  });
});