const request = require('supertest');
const app = require('../src/app');  

describe('Event Requests Routes', () => {
  it('GET /api/event-requests - debería devolver todas las event requests', async () => {
    const res = await request(app).get('/api/event-requests');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/event-requests/:id - debería devolver una event request específica', async () => {
    const res = await request(app).get('/api/event-requests/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /api/event-requests - debería crear una nueva event request', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana
    
    const newEventRequest = {
      group_id: 1,
      public_space_id: 1,
      name: "Evento de prueba",
      goal: "Objetivo del evento",
      description: "Descripción del evento",
      date: futureDate.toISOString(),
      n_attendees: 50
    };
    const res = await request(app).post('/api/event-requests').send(newEventRequest);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('group_id', 1);
  });

  it('PATCH /api/event-requests/:id - debería actualizar una event request', async () => {
    const updatedEventRequest = {
      name: "Evento actualizado",
      n_attendees: 75
    };
    const res = await request(app).patch('/api/event-requests/1').send(updatedEventRequest);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Evento actualizado');
  });

  it('DELETE /api/event-requests/:id - debería eliminar una event request', async () => {
    const res = await request(app).delete('/api/event-requests/1');
    expect(res.status).toBe(204);
  });
});