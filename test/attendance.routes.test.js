const request = require('supertest');
const app = require('../src/app');

describe('Attendance Routes', () => {
  it('GET /attendance - debería devolver todas las attendance', async () => {
    const res = await request(app).get('/attendance');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /attendance/:id - debería devolver una attendance específica', async () => {
    const res = await request(app).get('/attendance/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /attendance - debería crear una nueva attendance', async () => {
    const newAttendance = {
      student_id: 1,
      event_id: 2,
      rating: 5,
      feedback: "Excelente evento!"
    };
    const res = await request(app).post('/attendance').send(newAttendance);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('student_id', 1);
  });

  it('PATCH /attendance/:id - debería actualizar una attendance', async () => {
    const updatedAttendance = {
      rating: 4,
      feedback: "Buen evento"
    };
    const res = await request(app).patch('/attendance/1').send(updatedAttendance);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rating', 4);
  });

  it('DELETE /attendance/:id - debería eliminar una attendance', async () => {
    const res = await request(app).delete('/attendance/1');
    expect(res.status).toBe(204);
  });
});