const request = require('supertest');
const app = require('../src/app');

describe('User Routes', () => {
  it('GET /api/users - debería devolver todos los users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /api/users/:id - debería devolver un user específico', async () => {
    const res = await request(app)
      .get('/api/users/1')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('id', 1);
  });

  it('GET /api/users/profile - debería devolver el perfil del user autenticado', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('id');
  });

  it('POST /api/users - debería crear un nuevo user', async () => {
    const newUser = {
      first_name: 'Juan',
      last_name: 'Pérez',
      email: 'juan.perez@test.com',
      // hashed_password no se usa en el backend, se usa auth0_id
      auth0_id: 'auth0|new-test-user',
      career: 'Ingeniería',
      phone: '+56912345678',
      student_number: '12345678J'
    };
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', 'Bearer valid-token')
      .send(newUser);

    // Si falla, mostrar error para debugging
    if (res.status !== 201) {
      console.error('POST /users error:', res.body);
    }

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('email', 'juan.perez@test.com');
  });

  it('PATCH /api/users/profile - debería actualizar el perfil del user', async () => {
    const updatedUser = {
      first_name: 'Juan Carlos'
    };
    const res = await request(app)
      .patch('/api/users/profile')
      .set('Authorization', 'Bearer valid-token')
      .send(updatedUser);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('first_name', 'Juan Carlos');
  });

  it('DELETE /api/users/:id - debería eliminar un user', async () => {
    const res = await request(app)
      .delete('/api/users/1')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
  });
});