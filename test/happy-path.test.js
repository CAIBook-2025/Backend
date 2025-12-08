const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Happy Path Tests - Flujos exitosos completos', () => {

  describe('Flujo completo de creación de usuario y grupo', () => {
    it('Debería crear un usuario y luego crear un grupo con ese usuario como representante', async () => {
      // 0. Promover al usuario del token (User 1) a ADMIN para poder crear grupo
      await prisma.user.update({
        where: { id: 1 },
        data: { role: 'ADMIN' }
      });

      // 1. Crear usuario (el que será representante)
      const newUser = {
        email: 'representante@test.com',
        hashed_password: 'password123',
        first_name: 'María',
        last_name: 'González',
        phone: '12345678',
        auth0_id: 'auth0|happy-path-1',
        career: 'Ingeniería',
        student_number: '123456'
      };

      const userResponse = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(newUser);

      expect(userResponse.status).toBe(201);
      expect(userResponse.body).toHaveProperty('id');
      const userId = userResponse.body.id;

      // 1.6. Crear solicitud de grupo previa (requisito para crear grupo)
      // El user_id debe ser el del representante
      const groupRequest = await prisma.groupRequest.create({
        data: {
          user_id: userId,
          name: 'Grupo de estudio',
          goal: 'Estudiar mucho',
          status: 'CONFIRMED'
        }
      });

      // 2. Crear grupo
      const newGroup = {
        repre_id: userId,
        group_request_id: groupRequest.id,
        reputation: 5
      };

      const groupResponse = await request(app)
        .post('/api/groups')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(newGroup);

      if (groupResponse.status !== 201) console.error('Error Grupo:', groupResponse.body);
      expect(groupResponse.status).toBe(201);
      expect(groupResponse.body).toHaveProperty('repre_id', userId);
    });
  });

  describe('Flujo completo de solicitud de evento', () => {
    it('Debería crear grupo, espacio público y luego solicitar evento', async () => {
      // 0. Promover al usuario del token (User 1) a ADMIN
      await prisma.user.update({
        where: { id: 1 },
        data: { role: 'ADMIN' }
      });

      // 1. Crear Usuario Admin (para ser representante del grupo)
      const admin = await prisma.user.create({
        data: {
          auth0_id: 'admin-happy-event',
          first_name: 'Admin',
          last_name: 'Event',
          email: 'admin.event@test.com',
          role: 'ADMIN',
          phone: '99999999',
          student_number: '999999',
          career: 'Admin'
        }
      });

      // 2. Crear espacio público
      const newSpace = {
        name: 'Auditorio Central',
        capacity: 150,
        location: 'Campus Central',
        available: 'AVAILABLE'
      };

      // Simular token de admin (se requiere autenticación/admin para spaces)
      const spaceResponse = await request(app)
        .post('/api/public-spaces')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(newSpace);

      expect(spaceResponse.status).toBe(201);
      const spaceId = spaceResponse.body.id;

      // 3. Crear grupo (con dependencias)
      const groupRequest = await prisma.groupRequest.create({
        data: {
          user_id: admin.id,
          name: 'Grupo Eventos',
          goal: 'Organizar',
          status: 'CONFIRMED'
        }
      });

      const newGroup = {
        repre_id: admin.id,
        group_request_id: groupRequest.id,
        reputation: 5
      };

      const groupResponse = await request(app)
        .post('/api/groups')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(newGroup);

      expect(groupResponse.status).toBe(201);
      const groupId = groupResponse.body.id;

      // 4. Solicitar evento
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana

      const eventRequest = {
        group_id: groupId,
        public_space_id: spaceId,
        name: 'Torneo de Debate Universitario',
        goal: 'Competencia de debate entre estudiantes',
        description: 'Evento académico de debate',
        day: futureDate.toISOString(),
        module: 1,
        n_attendees: 80
      };

      // NOTA: POST /api/events es la ruta correcta según eventRequests.routes.test.js
      // Pero el endpoint real es /api/events en app.js que monta eventRequestsRouter
      const requestResponse = await request(app)
        .post('/api/events')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(eventRequest);

      if (requestResponse.status !== 201) console.error('Error Evento:', requestResponse.body);
      expect(requestResponse.status).toBe(201);
      expect(requestResponse.body).toHaveProperty('name', 'Torneo de Debate Universitario');
    });
  });

  describe('Flujo completo de reserva de sala de estudio', () => {
    it('Debería crear sala de estudio y hacer reserva exitosa', async () => {
      // 0. Crear Usuario (requerido para reserva)
      const user = await prisma.user.create({
        data: {
          auth0_id: 'user-happy-room',
          first_name: 'Room',
          last_name: 'User',
          email: 'room.user@test.com',
          role: 'ADMIN', // Para crear la sala
          phone: '11111111',
          student_number: '111111',
          career: 'Estudio'
        }
      });

      // 1. Crear sala de estudio
      const newRoom = {
        name: 'Sala de Estudio Premium',
        capacity: 8,
        location: 'Biblioteca',
        equipment: ['Proyector', 'Pizarra Digital']
      };

      // POST /api/sRooms
      const roomResponse = await request(app)
        .post('/api/sRooms')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(newRoom);

      expect(roomResponse.status).toBe(201);
      const roomId = roomResponse.body.id;

      // 2. Crear Horario (Schedule) - Paso intermedio necesario en DB real
      const futureDay = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana
      const scheduleData = {
        srId: roomId,
        day: futureDay.toISOString(), // YYYY-MM-DDT...
        module: 1, // Int
        available: 'AVAILABLE'
      };

      const scheduleResponse = await request(app)
        .post('/api/srSchedule')
        .send(scheduleData);

      expect(scheduleResponse.status).toBe(201);
      const scheduleId = scheduleResponse.body.id;

      // 3. Reservar (Book)
      const bookData = {
        userId: user.id,
        id: scheduleId
      };

      const bookResponse = await request(app)
        .patch('/api/srSchedule/book')
        .send(bookData);

      expect(bookResponse.status).toBe(200);
      expect(bookResponse.body).toHaveProperty('user_id', user.id);
      expect(bookResponse.body).toHaveProperty('available', 'UNAVAILABLE');
    });
  });
});