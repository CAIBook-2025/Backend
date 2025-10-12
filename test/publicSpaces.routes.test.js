const request = require('supertest');
const app = require('../src/app');

describe('Public Spaces Routes', () => {
  it('GET /api/public-spaces - debería devolver todos los public spaces', async () => {
    const res = await request(app).get('/api/public-spaces');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/public-spaces/:id - debería devolver un public space específico', async () => {
    const res = await request(app).get('/api/public-spaces/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /api/public-spaces - debería crear un nuevo public space', async () => {
    const newPublicSpace = {
      name: 'Auditorio Principal',
      capacity: 200,
      availability: 'AVAILABLE'
    };
    const res = await request(app).post('/api/public-spaces').send(newPublicSpace);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Auditorio Principal');
  });

  it('PATCH /api/public-spaces/:id - debería actualizar un public space', async () => {
    const updatedPublicSpace = {
      name: 'Auditorio Actualizado',
      capacity: 250
    };
    const res = await request(app).patch('/api/public-spaces/1').send(updatedPublicSpace);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('DELETE /api/public-spaces/:id - debería eliminar un public space', async () => {
    const res = await request(app).delete('/api/public-spaces/1');
    expect(res.status).toBe(204);
  });
});