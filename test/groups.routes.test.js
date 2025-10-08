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
      name: 'Grupo de estudio',
      description: 'Grupo para estudiar matemáticas',
      representativeId: 1
    };
    const res = await request(app).post('/api/groups').send(newGroup);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Grupo de estudio');
  });

  it('PATCH /api/groups/:id - debería actualizar un group', async () => {
    const updatedGroup = {
      name: "Grupo actualizado",
      description: "Nueva descripción del grupo"
    };
    const res = await request(app).patch('/api/groups/1').send(updatedGroup);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Grupo actualizado');
  });

  it('DELETE /api/groups/:id - debería eliminar un group', async () => {
    const res = await request(app).delete('/api/groups/1');
    expect(res.status).toBe(204);
  });
});