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
      public_space_id: 1,
      group_id: 1,
      startsAt: futureDate.toISOString(),
      endsAt: endDate.toISOString(),
      title: 'Evento de prueba'
    };
    const res = await request(app).post('/api/events').send(newEvent);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('title', 'Evento de prueba');
  });

  it('PATCH /api/events/:id - debería actualizar un event', async () => {
    const updatedEvent = {
      title: 'Evento actualizado',
      description: 'Nueva descripción'
    };
    const res = await request(app).patch('/api/events/1').send(updatedEvent);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('title', 'Evento actualizado');
  });

  it('DELETE /api/events/:id - debería eliminar un event', async () => {
    const res = await request(app).delete('/api/events/1');
    expect(res.status).toBe(204);
  });
});