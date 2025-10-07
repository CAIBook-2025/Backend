const request = require('supertest');
const app = require('../src/app');  

describe('Schedule Routes', () => {
  it('GET /schedules - debería devolver todos los schedule', async () => {
    const res = await request(app).get('/schedules');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /schedules/:id - debería devolver un schedule específico', async () => {
    const res = await request(app).get('/schedules/1'); 
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /schedules - debería crear un nuevo schedule', async () => {
    const newSchedule = {
      userId: 1,
      srId: 1,
      startsAt: "2024-12-01T08:00:00.000Z",
      endsAt: "2024-12-01T09:30:00.000Z"
    };
    const res = await request(app).post('/schedules').send(newSchedule);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId', 1);
  });

  it('PATCH /schedules/:id - debería actualizar un schedule', async () => {
    const updatedSchedule = {
      subject: "Física",
      day: "Tuesday"
    };
    const res = await request(app).patch('/schedules/1').send(updatedSchedule);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('subject', 'Física');
  });

  it('DELETE /schedules/:id - debería eliminar un schedule', async () => {
    const res = await request(app).delete('/schedules/1');
    expect(res.status).toBe(204);
  });
});