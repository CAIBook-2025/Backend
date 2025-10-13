const request = require('supertest');
const app = require('../src/app'); 

describe('Groups Routes', () => {
  it('GET /api/groups - debería devolver todos los groups', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/groups/:id - debería devolver un group específico', async () => {
    const res = await request(app).get('/api/groups/1'); 
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /api/groups - debería crear un nuevo group', async () => {
    const newGroup = {
      repre_id: 1,
      group_request_id: 1,
      moderators_ids: [2, 3],
      reputation: 5
    };
    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(newGroup);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Grupo de estudio');
  });

  it('PATCH /api/groups/:id - debería actualizar un group', async () => {
    const updatedGroup = {
      reputation: 8.5
    };
    const res = await request(app)
      .patch('/api/groups/1')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(updatedGroup);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reputation', 8.5);
  });

  it('DELETE /api/groups/:id - debería eliminar un group', async () => {
    const res = await request(app)
      .delete('/api/groups/1')
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(204);
  });
});