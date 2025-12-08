const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Event Requests Routes', () => {
  let createdRequestId;
  let createdGroupId;
  let createdSpaceId;
  let adminUser, adminToken;
  let studentUser, studentToken;

  beforeEach(async () => {
    // Generar identificador único para evitar conflictos
    const uniqueId = Date.now();

    // 1. Crear Admin
    adminUser = await prisma.user.create({
      data: {
        first_name: 'Admin',
        last_name: 'Events',
        email: `admin.events.${uniqueId}@test.com`,
        auth0_id: `auth0|admin-events-${uniqueId}`,
        role: 'ADMIN',
        phone: '99999999',
        student_number: `ADM-EVT-${uniqueId}`,
        career: 'Admin'
      }
    });
    adminToken = `Bearer user-json:${JSON.stringify({ sub: adminUser.auth0_id, email: adminUser.email })}`;

    // 2. Crear Student (Representante)
    studentUser = await prisma.user.create({
      data: {
        first_name: 'Student',
        last_name: 'Events',
        email: `student.events.${uniqueId}@test.com`,
        auth0_id: `auth0|student-events-${uniqueId}`,
        role: 'STUDENT',
        phone: '12345678',
        student_number: `STD-EVT-${uniqueId}`,
        career: 'Ingeniería'
      }
    });
    studentToken = `Bearer user-json:${JSON.stringify({ sub: studentUser.auth0_id, email: studentUser.email })}`;

    // 3. Crear Estructura de Grupo
    // a. Request
    const gr = await prisma.groupRequest.create({
      data: {
        user_id: studentUser.id,
        name: 'Group For Event',
        goal: 'Events',
        status: 'CONFIRMED'
      }
    });

    // b. Group
    const group = await prisma.group.create({
      data: {
        group_request_id: gr.id,
        repre_id: studentUser.id,
        reputation: 5.0
      }
    });
    createdGroupId = group.id;

    // 4. Crear Espacio Público
    const ps = await prisma.publicSpace.create({
      data: {
        name: `Event Space ${uniqueId}`,
        capacity: 100,
        location: 'Hall',
        available: 'AVAILABLE'
      }
    });
    createdSpaceId = ps.id;

    // 5. Crear Solicitud de Evento (Seed)
    const er = await prisma.eventRequest.create({
      data: {
        group_id: createdGroupId,
        public_space_id: createdSpaceId,
        name: 'Seed Event',
        goal: 'Fun',
        description: 'Test Description',
        day: new Date('2025-12-25T00:00:00.000Z'),
        module: 1,
        status: 'PENDING'
      }
    });
    createdRequestId = er.id;
  });

  it('GET /api/events - debería devolver todas las event requests', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Verificar que existe la creada
    expect(res.body.some(e => e.id === createdRequestId)).toBe(true);
  });

  it('GET /api/events/:id - debería devolver una event request específica', async () => {
    const res = await request(app)
      .get(`/api/events/${createdRequestId}`)
      .set('Authorization', adminToken);
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
      n_attendees: 50 // Note: schema matches logic? Controller handles n_attendees
    };

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', studentToken) // Como representante
      .send(newEventRequest);

    if (res.status !== 201) console.error('POST Error:', res.body);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('group_id', createdGroupId);
    expect(res.body).toHaveProperty('name', 'Evento de prueba');
  });

  it('PATCH /api/events/:id - debería actualizar una event request', async () => {
    const updatedEventRequest = {
      name: 'Evento actualizado',
      description: 'New desc'
    };
    const res = await request(app)
      .patch(`/api/events/${createdRequestId}`)
      .set('Authorization', studentToken) // Representante own request
      .send(updatedEventRequest);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Evento actualizado');
  });

  it('DELETE /api/events/:id - debería eliminar una event request', async () => {
    const res = await request(app)
      .delete(`/api/events/${createdRequestId}`)
      .set('Authorization', studentToken);
    expect([200, 204]).toContain(res.status);
  });
});