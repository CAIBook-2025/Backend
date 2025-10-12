const request = require('supertest');
const app = require('../src/app');

describe('Happy Path Tests - Flujos exitosos completos', () => {
  describe('Flujo completo de creación de usuario y grupo', () => {
    it('Debería crear un usuario y luego crear un grupo con ese usuario como representante', async () => {
      // 1. Crear usuario
      const newUser = {
        email: 'representante@test.com',
        hashed_password: 'password123',
        first_name: 'María',
        last_name: 'González'
      };
      
      const userResponse = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(newUser);
      
      expect(userResponse.status).toBe(201);
      expect(userResponse.body).toHaveProperty('id');
      
      // 2. Crear grupo con el usuario como representante
      const newGroup = {
        name: 'Grupo de Matemáticas Avanzadas',
        description: 'Grupo para estudiar cálculo diferencial',
        representativeId: userResponse.body.id
      };
      
      const groupResponse = await request(app)
        .post('/api/groups')
        .send(newGroup);
      
      expect(groupResponse.status).toBe(201);
      expect(groupResponse.body).toHaveProperty('name', 'Grupo de Matemáticas Avanzadas');
      expect(groupResponse.body).toHaveProperty('representativeId', userResponse.body.id);
    });
  });

  describe('Flujo completo de solicitud de evento', () => {
    it('Debería crear grupo, espacio público y luego solicitar evento', async () => {
      // 1. Crear espacio público
      const newSpace = {
        name: 'Auditorio Central',
        capacity: 150,
        availability: 'AVAILABLE'
      };
      
      const spaceResponse = await request(app)
        .post('/api/public-spaces')
        .send(newSpace);
      
      expect(spaceResponse.status).toBe(201);
      
      // 2. Crear grupo
      const newGroup = {
        name: 'Club de Debate',
        description: 'Club universitario de debate',
        representativeId: 1
      };
      
      const groupResponse = await request(app)
        .post('/api/groups')
        .send(newGroup);
      
      expect(groupResponse.status).toBe(201);
      
      // 3. Solicitar evento
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana
      
      const eventRequest = {
        group_id: groupResponse.body.id,
        public_space_id: spaceResponse.body.id,
        name: 'Torneo de Debate Universitario',
        goal: 'Competencia de debate entre estudiantes',
        description: 'Evento académico de debate',
        date: futureDate.toISOString(),
        n_attendees: 80
      };
      
      const requestResponse = await request(app)
        .post('/api/event-requests')
        .send(eventRequest);
      
      expect(requestResponse.status).toBe(201);
      expect(requestResponse.body).toHaveProperty('name', 'Torneo de Debate Universitario');
    });
  });

  describe('Flujo completo de reserva de sala de estudio', () => {
    it('Debería crear sala de estudio y hacer reserva exitosa', async () => {
      // 1. Crear sala de estudio
      const newRoom = {
        name: 'Sala de Estudio Premium',
        capacity: 8,
        resources: ['Proyector', 'Pizarra Digital']
      };
      
      const roomResponse = await request(app)
        .post('/api/sRooms')
        .send(newRoom);
      
      expect(roomResponse.status).toBe(201);
      
      // 2. Hacer reserva de horario
      const futureDay = new Date(Date.now() + 24 * 60 * 60 * 1000); // Mañana
      
      const schedule = {
        srId: roomResponse.body.id,
        day: futureDay.toISOString().split('T')[0] + 'T00:00:00.000Z',
        module: "09:00-11:00",
        available: "OCCUPIED"
      };
      
      const scheduleResponse = await request(app)
        .post('/api/srSchedule')
        .send(schedule);
      
      expect(scheduleResponse.status).toBe(201);
      expect(scheduleResponse.body).toHaveProperty('sr_id', roomResponse.body.id);
    });
  });
});