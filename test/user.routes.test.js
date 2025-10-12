const request = require('supertest');
const app = require('../src/app');

describe('User Routes', () => {
  it('GET /api/users - debería devolver todos los users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /api/users/:id - debería devolver un user específico', async () => {
    const res = await request(app).get('/api/users/1'); 
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('GET /api/users/profile - debería devolver el perfil del user autenticado', async () => {
    // Este test requiere autenticación JWT
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('id');
  });

  it('POST /api/users - debería crear un nuevo user', async () => {
    const newUser = {
      first_name: 'Juan',
      last_name: 'Pérez',
      email: 'juan.perez@test.com',
      hashed_password: 'hashedpassword123'
    };
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(newUser);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('email', 'juan.perez@test.com');
  });

  it('PATCH /api/users/:id - debería actualizar un user', async () => {
    const updatedUser = {
      first_name: 'Juan Carlos'
    };
    const res = await request(app).patch('/api/users/1').send(updatedUser);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('first_name', 'Juan Carlos');
  });

  it('DELETE /api/users/:id - debería eliminar un user', async () => {
    const res = await request(app).delete('/api/users/1');
    expect(res.status).toBe(204);
  });

  it('PATCH /users/:id - debería actualizar un user', async () => {
    const updatedUser = {
      first_name: 'Juan Carlos',
      career: 'Ingeniería Industrial'
    };
    const res = await request(app).patch('/api/users/1').send(updatedUser);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('first_name', 'Juan Carlos');
  });

  it('DELETE /api/users/:id - debería eliminar un user', async () => {
    const res = await request(app).delete('/api/users/1');
    expect(res.status).toBe(204);
  });
});