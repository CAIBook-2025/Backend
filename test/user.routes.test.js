const request = require('supertest');
const app = require('../src/app');

describe('User Routes', () => {
  it('GET /users - debería devolver todos los users', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /users/:id - debería devolver un user específico', async () => {
    const res = await request(app).get('/users/1'); 
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('GET /users/profile - debería devolver el perfil del user autenticado', async () => {
    // Este test requiere autenticación JWT
    const res = await request(app)
      .get('/users/profile')
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('POST /users - debería crear un nuevo user', async () => {
    const newUser = {
      email: 'juan.perez@test.com',
      hashed_password: 'hashed_password_123',
      first_name: 'Juan',
      last_name: 'Pérez'
    };
    const res = await request(app)
      .post('/users')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(newUser);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('email', 'juan.perez@test.com');
  });

  it('PATCH /users/:id - debería actualizar un user', async () => {
    const updatedUser = {
      first_name: "Juan Carlos",
      career: "Ingeniería Industrial"
    };
    const res = await request(app).patch('/users/1').send(updatedUser);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('first_name', 'Juan Carlos');
  });

  it('DELETE /users/:id - debería eliminar un user', async () => {
    const res = await request(app).delete('/users/1');
    expect(res.status).toBe(204);
  });
});