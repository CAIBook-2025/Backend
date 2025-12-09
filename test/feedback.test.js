const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('GET api/event-feedback - Asegurar la obtención de feedbacks', () => {

  let representativeUser, normalUser, groupRequest, group, eventRequest, publicSpace, feedback;

  beforeEach(async() => {
    // Limpiar datos antes de cada test
    await prisma.feedback.deleteMany({});
    await prisma.eventRequest.deleteMany({});
    await prisma.group.deleteMany({});
    await prisma.groupRequest.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.publicSpace.deleteMany({});

    representativeUser = await prisma.user.create({
      data: {
        auth0_id: 'auth0|representative-user',
        email: 'representative-user@example.com',
        first_name: 'Feedback',
        last_name: 'Tester',
        career: 'QA',
        phone: '5555555555',
        student_number: 'FB-TEST-001'
      }
    });

    normalUser = await prisma.user.create({
      data: {
        auth0_id: 'auth0|normal-user',
        email: 'normal-user@example.com',
        first_name: 'Normal',
        last_name: 'User',
        career: 'Engineering',
        phone: '5555555556',
        student_number: 'NU-TEST-002'
      }
    });

    groupRequest = await prisma.groupRequest.create({
      data: {
        name: 'Feedback Test Group',
        goal: 'Testing feedback functionality',
        description: 'Group created for testing event feedback features',
        user_id: representativeUser.id,
        status: 'CONFIRMED'
      }
    });

    group = await prisma.group.create({
      data: {
        repre_id: representativeUser.id,
        group_request_id: groupRequest.id,
      }
    });

    publicSpace = await prisma.publicSpace.create({
      data: {
        name: 'Feedback Test Space',
        capacity: 100,
        location: 'Test Location',
        available: 'AVAILABLE'
      }
    });

    eventRequest = await prisma.eventRequest.create({
      data: {
        group_id: group.id,
        public_space_id: publicSpace.id,
        name: 'Feedback Test Event',
        goal: 'Test event for feedback',
        description: 'Event created to test feedback submission and retrieval',
        day: new Date(),
        module: 2,
        status: 'CONFIRMED'
      }
    });

    feedback = await prisma.feedback.create({
      data: {
        event_id: eventRequest.id,
        student_id: normalUser.id,
        rating: 4,
        comment: 'Buen evento, pero podría mejorar en algunos aspectos.'
      }
    });
  });

  it('Debería obtener el feedback creado', async () => {
        
    const response = await request(app)
      .get(`/api/event-feedback/${feedback.id}`)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);
        
    expect(response.status).toBe(200);
    expect(Number(response.body.rating)).toBe(4);
    expect(response.body.comment).toBe('Buen evento, pero podría mejorar en algunos aspectos.');
  });

  it('Debería retornar 404 para un feedback inexistente', async () => {
        
    const response = await request(app)
      .get('/api/event-feedback/999999')
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);
        
    expect(response.status).toBe(404);
  });
});

describe('POST api/event-feedback - Asegurar el envío de feedbacks', () => {
  let representativeUser, normalUser, groupRequest, group, eventRequest, publicSpace;

  beforeEach(async() => {
    // Limpiar datos antes de cada test
    await prisma.feedback.deleteMany({});
    await prisma.eventRequest.deleteMany({});
    await prisma.group.deleteMany({});
    await prisma.groupRequest.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.publicSpace.deleteMany({});

    representativeUser = await prisma.user.create({
      data: {
        auth0_id: 'auth0|representative-user',
        email: 'representative-user@example.com',
        first_name: 'Feedback',
        last_name: 'Tester',
        career: 'QA',
        phone: '5555555555',
        student_number: 'FB-TEST-001'
      }
    });

    normalUser = await prisma.user.create({
      data: {
        auth0_id: 'auth0|normal-user',
        email: 'normal-user@example.com',
        first_name: 'Normal',
        last_name: 'User',
        career: 'Engineering',
        phone: '5555555556',
        student_number: 'NU-TEST-002'
      }
    });

    groupRequest = await prisma.groupRequest.create({
      data: {
        name: 'Feedback Test Group',
        goal: 'Testing feedback functionality',
        description: 'Group created for testing event feedback features',
        user_id: representativeUser.id,
        status: 'CONFIRMED'
      }
    });

    group = await prisma.group.create({
      data: {
        repre_id: representativeUser.id,
        group_request_id: groupRequest.id,
      }
    });

    publicSpace = await prisma.publicSpace.create({
      data: {
        name: 'Feedback Test Space',
        capacity: 100,
        location: 'Test Location',
        available: 'AVAILABLE'
      }
    });

    eventRequest = await prisma.eventRequest.create({
      data: {
        group_id: group.id,
        public_space_id: publicSpace.id,
        name: 'Feedback Test Event',
        goal: 'Test event for feedback',
        description: 'Event created to test feedback submission and retrieval',
        day: new Date(),
        module: 2,
        status: 'CONFIRMED'
      }
    });
  });

  it('Debería permitir a un estudiante enviar feedback para un evento', async () => {
    const feedbackData = {
      event_id: eventRequest.id,
      student_id: normalUser.id,
      rating: 5,
      comment: 'Excelente evento, muy bien organizado.'
    };

    const response = await request(app)
      .post('/api/event-feedback')
      .send(feedbackData)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);

    expect(response.status).toBe(201);
    expect(Number(response.body.rating)).toBe(5);
        
    const createdFeedbackId = response.body.id;
    const createdFeedback = await prisma.feedback.findUnique({
      where: {
        id: createdFeedbackId
      }
    });

    expect(Number(createdFeedback.rating)).toBe(5);
    expect(createdFeedback.comment).toBe('Excelente evento, muy bien organizado.');
  });

  it('La reputación del grupo debería ser un promedio entre los feedbacks enviados', async () => {
    const normalUser2 = await prisma.user.create({
      data: {
        auth0_id: 'auth0|normal-user-2',
        email: 'normal-user2@example.com',
        first_name: 'Normal',
        last_name: 'User2',
        career: 'Engineering',
        phone: '5555555556',
        student_number: 'NU-TEST-002'
      }
    });

    const feedbackData1 = {
      event_id: eventRequest.id,
      student_id: normalUser.id,
      rating: 5,
      comment: 'Gran evento!'
    };

    const feedbackData2 = {
      event_id: eventRequest.id,
      student_id: normalUser2.id,
      rating: 4,
      comment: 'Buen evento, pero con áreas de mejora.'
    };

    await request(app)
      .post('/api/event-feedback')
      .send(feedbackData1)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);

    await request(app)
      .post('/api/event-feedback')
      .send(feedbackData2)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser2.auth0_id, email: normalUser2.email })}`);

    const updatedGroup = await prisma.group.findUnique({
      where: {
        id: group.id
      }
    });

    expect(Number(updatedGroup.reputation)).toBe(4.5);
  });        

  it('Debería retornar 400 al enviar feedback con datos incompletos', async () => {
    const incompleteFeedbackData = {
      event_id: eventRequest.id,
      student_id: normalUser.id,
    };

    const response = await request(app)
      .post('/api/event-feedback')
      .send(incompleteFeedbackData)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);

    expect(response.status).toBe(400);
  });

  it('Debería retornar 404 al enviar feedback para un evento inexistente', async () => {
    const feedbackData = {
      event_id: 999999,
      student_id: normalUser.id,
      rating: 4,
      comment: 'Evento inexistente.'
    };

    const response = await request(app)
      .post('/api/event-feedback')
      .send(feedbackData)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Evento no encontrado');
  });

  it('Debería retornar 409 si ya ha enviado feedback para el mismo evento', async () => {
    const feedbackData = {
      event_id: eventRequest.id,
      student_id: normalUser.id,
      rating: 4,
      comment: 'Primer feedback.'
    };

    await request(app)
      .post('/api/event-feedback')
      .send(feedbackData)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);

    const response = await request(app)
      .post('/api/event-feedback')
      .send(feedbackData)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('El estudiante ya ha proporcionado feedback para este evento');
  });
});