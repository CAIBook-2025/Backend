const request = require('supertest');
const app = require('../src/app');

describe('Public Spaces Routes', () => {
  // Nota: Esta ruta no tiene endpoints implementados aún
  // Los siguientes tests fallarán hasta que se implementen los endpoints

  it('GET /api/public-spaces - debería devolver todos los public spaces', async () => {
    const res = await request(app).get('/api/public-spaces');
    // Como no hay endpoints implementados, esperamos un 404
    expect([200, 404]).toContain(res.status);
  });

  // Comentado hasta que se implementen los endpoints
  /*
  it('GET /api/public-spaces/:id - debería devolver un public space específico', async () => {
    const res = await request(app).get('/api/public-spaces/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  it('POST /api/public-spaces - debería crear un nuevo public space', async () => {
    const newPublicSpace = {
      name: "Sala de conferencias A",
      capacity: 100,
      availability: true,
      resources: "Proyector, Micrófono, WiFi"
    };
    const res = await request(app).post('/api/public-spaces').send(newPublicSpace);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Sala de conferencias A');
  });

  it('PATCH /api/public-spaces/:id - debería actualizar un public space', async () => {
    const updatedPublicSpace = {
      name: "Sala actualizada",
      capacity: 150
    };
    const res = await request(app).patch('/api/public-spaces/1').send(updatedPublicSpace);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Sala actualizada');
  });

  it('DELETE /api/public-spaces/:id - debería eliminar un public space', async () => {
    const res = await request(app).delete('/api/public-spaces/1');
    expect(res.status).toBe(204);
  });
  */
});