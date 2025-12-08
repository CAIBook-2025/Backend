const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Happy Path Tests - Flujos exitosos completos', () => {
  let adminUser, adminToken;
  let repreUser, repreToken;

  beforeEach(async () => {
    // Generar identificador único para evitar conflictos en CI
    const uniqueId = Date.now();

    // Crear Admin
    adminUser = await prisma.user.create({
      data: {
        first_name: 'Admin',
        last_name: 'Super',
        email: `admin.happy.${uniqueId}@test.com`,
        auth0_id: `auth0|admin-happy-${uniqueId}`,
        role: 'ADMIN',
        phone: '99999999',
        student_number: `ADM999-${uniqueId}`,
        career: 'Admin'
      }
    });
    adminToken = `Bearer user-json:${JSON.stringify({ sub: adminUser.auth0_id, email: adminUser.email })}`;

    // Crear Representante
    repreUser = await prisma.user.create({
      data: {
        first_name: 'María',
        last_name: 'González',
        email: `repre.happy.${uniqueId}@test.com`,
        auth0_id: `auth0|repre-happy-${uniqueId}`,
        role: 'STUDENT',
        phone: '88888888',
        student_number: `STD888-${uniqueId}`,
        career: 'Ingeniería'
      }
    });
    repreToken = `Bearer user-json:${JSON.stringify({ sub: repreUser.auth0_id, email: repreUser.email })}`;
  });

  describe('Flujo completo de creación de usuario y grupo', () => {
    it('Debería crear solicitud de grupo, admin aprueba y se crea grupo automágicamente', async () => {
      // 1. Estudiante crea solicitud de grupo
      const groupRequestData = {
        name: 'Grupo Happy Path',
        goal: 'Estudiar para pruebas',
        description: 'Grupo dedicado al estudio intenso'
      };

      const requestResponse = await request(app)
        .post('/api/group-requests')
        .set('Authorization', repreToken)
        .send(groupRequestData);

      if (requestResponse.status !== 201) console.error('Error creando Request:', requestResponse.body);
      expect(requestResponse.status).toBe(201);
      const requestId = requestResponse.body.id;

      // 2. Admin confirma la solicitud
      const confirmResponse = await request(app)
        .patch(`/api/group-requests/${requestId}`)
        .set('Authorization', adminToken)
        .send({ status: 'CONFIRMED' });

      if (confirmResponse.status !== 200) console.error('Error confirmando Request:', confirmResponse.body);
      expect(confirmResponse.status).toBe(200);
      expect(confirmResponse.body.status).toBe('CONFIRMED');

      // 3. Verificar que el grupo se creó automáticamente
      const groupCheck = await prisma.group.findFirst({
        where: { group_request_id: requestId }
      });

      expect(groupCheck).not.toBeNull();
      expect(groupCheck.repre_id).toBe(repreUser.id);
    });
  });

  describe('Flujo completo de solicitud de evento', () => {
    it('Debería crear grupo (flujo admin), espacio público y luego solicitar evento', async () => {
      // 1. Preparar Grupo (Flujo correcto: Request -> Confirm)
      const grData = {
        user_id: repreUser.id,
        name: 'Grupo Eventos Happy',
        goal: 'Organizar eventos',
        status: 'PENDING'
      };
      const groupRequest = await prisma.groupRequest.create({ data: grData });

      // Admin confirma y crea grupo (simulado via servicio/prisma para agilizar, o via endpoint)
      // Via endpoint para ser fiel al happy path de integración
      const confirmRes = await request(app)
        .patch(`/api/group-requests/${groupRequest.id}`)
        .set('Authorization', adminToken)
        .send({ status: 'CONFIRMED' });
      expect(confirmRes.status).toBe(200);

      // Obtener el ID del grupo creado
      const group = await prisma.group.findFirst({ where: { group_request_id: groupRequest.id } });
      expect(group).toBeTruthy();
      const groupId = group.id;

      // 2. Crear espacio público (Solo admin)
      const newSpace = {
        name: 'Auditorio Happy',
        capacity: 150,
        location: 'Campus Norte',
        available: 'AVAILABLE'
      };

      const spaceResponse = await request(app)
        .post('/api/public-spaces')
        .set('Authorization', adminToken)
        .send(newSpace);

      if (spaceResponse.status !== 201) console.error('Error creando Space:', spaceResponse.body);
      expect(spaceResponse.status).toBe(201);
      const spaceId = spaceResponse.body.id;

      // 3. Solicitar evento (como representante del grupo)
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const eventRequest = {
        group_id: groupId,
        public_space_id: spaceId,
        name: 'Torneo de Debate Happy',
        goal: 'Debatir felizmente',
        description: 'Evento de prueba',
        day: futureDate.toISOString(),
        module: 1,
        n_attendees: 80
      };

      const requestResponse = await request(app)
        .post('/api/events')
        .set('Authorization', repreToken) // Representante solicita
        .send(eventRequest);

      if (requestResponse.status !== 201) console.error('Error Evento:', requestResponse.body);
      expect(requestResponse.status).toBe(201);
      expect(requestResponse.body).toHaveProperty('name', 'Torneo de Debate Happy');
    });
  });

  describe('Flujo completo de reserva de sala de estudio', () => {
    it('Debería crear sala de estudio y hacer reserva exitosa', async () => {
      // 1. Crear usuario Estudiante para reserva (podemos usar repreUser o crear otro)
      const studyUser = await prisma.user.create({
        data: {
          first_name: 'Estudioso',
          last_name: 'Room',
          email: 'study.room@test.com',
          auth0_id: 'auth0|study-room',
          role: 'STUDENT',
          phone: '77777777',
          student_number: 'STD777',
          career: 'Medicina'
        }
      });
      // El endpoint de booking a veces usa el user del token o el body.
      const studyToken = `Bearer user-json:${JSON.stringify({ sub: studyUser.auth0_id, email: studyUser.email })}`;

      // 2. Crear sala de estudio (Admin)
      const newRoom = {
        name: 'Sala de Estudio Happy',
        capacity: 5,
        location: 'Biblioteca Sur',
        equipment: ['Pizarra']
      };

      const roomResponse = await request(app)
        .post('/api/sRooms')
        .set('Authorization', adminToken)
        .send(newRoom);

      expect(roomResponse.status).toBe(201);
      const roomId = roomResponse.body.id;

      // 3. Crear Horario (Schedule)
      const futureDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const scheduleData = {
        srId: roomId,
        day: futureDay.toISOString(),
        module: 1,
        available: 'AVAILABLE'
      };

      const scheduleResponse = await request(app)
        .post('/api/srSchedule')
        .set('Authorization', adminToken) // Asunto admin
        .send(scheduleData);

      expect(scheduleResponse.status).toBe(201);
      const scheduleId = scheduleResponse.body.id;

      // 4. Reservar (Book)
      const bookData = {
        userId: studyUser.id,
        id: scheduleId
      };

      // Nota: El test original usaba PATCH /api/srSchedule/book
      // Verificaremos si requiere auth.
      const bookResponse = await request(app)
        .patch('/api/srSchedule/book')
        .set('Authorization', studyToken)
        .send(bookData);

      if (bookResponse.status !== 200) console.error('Error Booking:', bookResponse.body);
      expect(bookResponse.status).toBe(200);
      expect(bookResponse.body).toHaveProperty('user_id', studyUser.id);
      expect(bookResponse.body).toHaveProperty('available', 'UNAVAILABLE');
    });
  });
});