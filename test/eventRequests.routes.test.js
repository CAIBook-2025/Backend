const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Event Requests Routes', () => {
  let createdRequestId;
  let createdGroupId;
  let createdSpaceId;
  let userId = 1;

  beforeEach(async () => {
    // 1. Promover Usuario a ADMIN
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' }
    });

    // 2. Crear Dependencias de Grupo
    // a. GroupRequst
    const gr = await prisma.groupRequest.create({
      data: {
        user_id: userId,
        name: 'Group For Event',
        goal: 'Events',
        status: 'CONFIRMED'
      }
    });

    // b. Group
    const group = await prisma.group.create({
      data: {
        group_request_id: gr.id,
        repre_id: userId,
        reputation: 5.0
      }
    });
    createdGroupId = group.id;

    // 3. Crear Espacio Público
    const ps = await prisma.publicSpace.create({
      data: {
        name: 'Event Space',
        capacity: 100,
        location: 'Hall',
        available: 'AVAILABLE'
      }
    });
    createdSpaceId = ps.id;

    // 4. Crear Solicitud de Evento (Seed)
    const er = await prisma.eventRequest.create({
      data: {
        group_id: createdGroupId,
        public_space_id: createdSpaceId,
        name: 'Seed Event',
        goal: 'Fun',
        description: 'Test Description',
        day: new Date('2024-12-25T00:00:00.000Z'),
        module: 1,
        status: 'PENDING'
      }
    });
    createdRequestId = er.id;
  });

  it('GET /api/events - debería devolver todas las event requests', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/events/:id - debería devolver una event request específica', async () => {
    const res = await request(app)
      .get(`/api/events/${createdRequestId}`)
      .set('Authorization', 'Bearer valid-jwt-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', createdRequestId);
  });

  it('POST /api/events - debería crear una nueva event request', async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana

    const newEventRequest = {
      group_id: createdGroupId,
      public_space_id: createdSpaceId,
      name: 'Evento de prueba',
      goal: 'Objetivo del evento',
      description: 'Descripción del evento',
      day: futureDate.toISOString(),
      module: 2, // Int
      n_attendees: 50 // Note: schema doesn't have n_attendees? Check logic.
    };

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(newEventRequest);

    if (res.status !== 201) console.error('POST Error:', res.body);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('group_id', createdGroupId);
    expect(res.body).toHaveProperty('name', 'Evento de prueba');
  });

  it('PATCH /api/events/:id - debería actualizar una event request', async () => {
    const updatedEventRequest = {
      name: 'Evento actualizado',
      // n_attendees: 75 // Schema has no n_attendees. Removing from update.
      description: 'New desc'
    };
    const res = await request(app)
      .patch(`/api/events/${createdRequestId}`)
      .set('Authorization', 'Bearer valid-jwt-token')
      .send(updatedEventRequest);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Evento actualizado');
  });

  it('DELETE /api/events/:id - debería eliminar una event request', async () => {
    const res = await request(app)
      .delete(`/api/events/${createdRequestId}`)
      .set('Authorization', 'Bearer valid-jwt-token');
    expect([200, 204]).toContain(res.status);
  });
});