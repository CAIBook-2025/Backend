const request = require('supertest');
const app = require('../src/app');

describe('Strikes Routes', () => {
  it('GET /strikes - debería devolver todos los strikes', async () => {
    const res = await request(app).get('/strikes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /strikes/:id - debería devolver un strike específico', async () => {
    const res = await request(app).get('/strikes/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /strikes - debería crear un nuevo strike', async () => {
    const newStrike = {
      student_id: 1,
      reason: 'Incumplimiento de normas',
      admin_id: 2
    };
    const res = await request(app).post('/strikes').send(newStrike);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('student_id', 1);
  });

  it('PATCH /strikes/:id - debería actualizar un strike', async () => {
    const updatedStrike = {
      reason: "Razón actualizada",
      severity: "high"
    };
    const res = await request(app).patch('/strikes/1').send(updatedStrike);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('severity', 'high');
  });

  it('DELETE /strikes/:id - debería eliminar un strike', async () => {
    const res = await request(app).delete('/strikes/1');
    expect(res.status).toBe(204);
  });
});