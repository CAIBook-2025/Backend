const request = require('supertest');
const app = require('../src/app');  

describe('Events Routes', () => {
  it('GET /api/events - debería devolver todos los events', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/events/:id - debería devolver un event específico', async () => {
    const res = await request(app).get('/api/events/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /api/events - debería crear un nuevo event', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana
    const endDate = new Date(futureDate.getTime() + 2 * 60 * 60 * 1000); // 2 horas después
    
    const newEvent = {
      event_request_id: 1,
      start_time: futureDate.toISOString(),
      end_time: endDate.toISOString()
    };
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(newEvent);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('eventRequest.name', 'Test Event Request');
  });

  it('PATCH /api/events/:id - debería actualizar un event', async () => {
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // Pasado mañana
    const endDate = new Date(futureDate.getTime() + 3 * 60 * 60 * 1000); // 3 horas después
    
    const updatedEvent = {
      start_time: futureDate.toISOString(),
      end_time: endDate.toISOString()
    };
    const res = await request(app)
      .patch('/api/events/1')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(updatedEvent);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('start_time');
  });

  it('DELETE /api/events/:id - debería eliminar un event', async () => {
    const res = await request(app)
      .delete('/api/events/1')
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(204);
  });
});