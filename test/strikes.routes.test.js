const request = require('supertest');
const app = require('../src/app');

describe('Strikes Routes', () => {
  it('GET /api/strikes - debería devolver todos los strikes', async () => {
    const res = await request(app).get('/api/strikes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/strikes/:id - debería devolver un strike específico', async () => {
    const res = await request(app).get('/api/strikes/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /api/strikes - debería crear un nuevo strike', async () => {
    const newStrike = {
      student_id: 1,
      type: 'ATTENDANCE', // Campo requerido
      admin_id: 2,
      description: 'Incumplimiento de normas'
    };
    const res = await request(app).post('/api/strikes').send(newStrike);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('student_id', 1);
  });

  it('PATCH /api/strikes/:id - debería actualizar un strike', async () => {
    const updatedStrike = {
      description: "Descripción actualizada",
      type: "BEHAVIOR"
    };
    const res = await request(app).patch('/api/strikes/1').send(updatedStrike);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('type', 'BEHAVIOR');
  });

  it('DELETE /api/strikes/:id - debería eliminar un strike', async () => {
    const res = await request(app).delete('/api/strikes/1');
    expect(res.status).toBe(204);
  });
});