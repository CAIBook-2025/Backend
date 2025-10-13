const request = require('supertest');
const app = require('../src/app');

describe('Group Requests Routes', () => {
  it('GET /api/group-requests - debería devolver todas las group requests', async () => {
    const res = await request(app)
      .get('/api/group-requests')
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/group-requests/:id - debería devolver una group request específica', async () => {
    const res = await request(app)
      .get('/api/group-requests/1')
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /api/group-requests - debería crear una nueva group request', async () => {
    const newGroupRequest = {
      name: 'Grupo de estudio',
      goal: 'Preparar examen de matemáticas',
      description: 'Grupo para estudiar juntos'
    };
    const res = await request(app)
      .post('/api/group-requests')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(newGroupRequest);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Grupo de estudio');
  });

  it('PATCH /api/group-requests/:id - debería actualizar una group request', async () => {
    const updatedGroupRequest = {
      name: 'Grupo actualizado',
      description: 'Nueva descripción del grupo'
    };
    const res = await request(app)
      .patch('/api/group-requests/1')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(updatedGroupRequest);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Grupo actualizado');
  });

  it('DELETE /api/group-requests/:id - debería eliminar una group request', async () => {
    const res = await request(app)
      .delete('/api/group-requests/1')
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(204);
  });
});