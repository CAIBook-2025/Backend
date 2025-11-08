const request = require('supertest');
const app = require('../src/app');  

describe('Schedule Routes', () => {
  it('GET /api/srSchedule - debería devolver todos los schedule', async () => {
    const res = await request(app).get('/api/srSchedule');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /api/srSchedule/:id - debería devolver un schedule específico', async () => {
    const res = await request(app).get('/api/srSchedule/1'); 
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /api/srSchedule - debería crear un nuevo schedule', async () => {
    const newSchedule = {
      srId: 1,
      day: '2024-12-01T00:00:00.000Z',
      module: '08:00-09:30',
      available: 'AVAILABLE'
    };
    const res = await request(app).post('/api/srSchedule').send(newSchedule);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('sr_id', 1);
  });

  it('PATCH /api/srSchedule/book - debería reservar un schedule', async () => {
    const reserveData = {
      userId: 1,
      id: 1
    };
    const res = await request(app).patch('/api/srSchedule/book').send(reserveData);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sr_id', 1);
  });

  it('DELETE /api/srSchedule/:id - debería eliminar un schedule', async () => {
    const res = await request(app).delete('/api/srSchedule/1');
    expect(res.status).toBe(204);
  });
});