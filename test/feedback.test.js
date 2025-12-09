const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');
const testHelper = require('./helpers');

describe('GET api/event-feedback - Asegurar la obtención de feedbacks', () => {

  let representativeUser, normalUser, groupRequest, group, eventRequest, publicSpace, feedback;

  beforeEach(async() => {
    await testHelper.clearDatabase();
    representativeUser = await testHelper.createStudentUser('representative-user');
    normalUser =  await testHelper.createStudentUser('normal-user');
    groupRequest = await testHelper.createConfirmedGroupRequest(representativeUser.id);
    group = await testHelper.createGroup(representativeUser.id, groupRequest.id);
    publicSpace = await testHelper.createPublicSpace();
    eventRequest = await testHelper.createEventRequest(group.id, publicSpace.id);
    feedback = await testHelper.createFeedback(eventRequest.id, normalUser.id, 4, 'Buen evento, pero podría mejorar en algunos aspectos.');
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
    await testHelper.clearDatabase();
    representativeUser = await testHelper.createStudentUser('representative-user');
    normalUser =  await testHelper.createStudentUser('normal-user');
    groupRequest = await testHelper.createConfirmedGroupRequest(representativeUser.id);
    group = await testHelper.createGroup(representativeUser.id, groupRequest.id);
    publicSpace = await testHelper.createPublicSpace();
    eventRequest = await testHelper.createEventRequest(group.id, publicSpace.id);

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

describe('PATCH /event-feedback - Asegurar ediciones a feedbacks', () => {

  let representativeUser, normalUser, groupRequest, group, eventRequest, publicSpace, feedback;

  beforeEach(async() => {
    await testHelper.clearDatabase();
    representativeUser = await testHelper.createStudentUser('representative-user');
    normalUser =  await testHelper.createStudentUser('normal-user');
    groupRequest = await testHelper.createConfirmedGroupRequest(representativeUser.id);
    group = await testHelper.createGroup(representativeUser.id, groupRequest.id, 3.0);
    publicSpace = await testHelper.createPublicSpace();
    eventRequest = await testHelper.createEventRequest(group.id, publicSpace.id);
    feedback = await testHelper.createFeedback(eventRequest.id, normalUser.id, 3, 'El evento estuvo bien.');
  });

  it('Debería permitir a un estudiante editar su feedback', async () => {
    const updatedFeedbackData = {
      rating: 5,
      comment: 'El evento fue excelente después de todo.'
    };

    const response = await request(app)
      .patch(`/api/event-feedback/${feedback.id}`)
      .send(updatedFeedbackData)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);

    expect(response.status).toBe(200);
    expect(Number(response.body.rating)).toBe(5);
    expect(response.body.comment).toBe('El evento fue excelente después de todo.');

    const updatedFeedback = await prisma.feedback.findUnique({
      where: {
        id: response.body.id
      }
    });

    expect(Number(updatedFeedback.rating)).toBe(5);
    expect(updatedFeedback.comment).toBe('El evento fue excelente después de todo.');
  });

  it('La reputación del grupo debería actualizarse al editar un feedback', async () => {
    const originalGroup = await prisma.group.findUnique({
      where: {
        id: group.id
      }
    });
    expect(Number(originalGroup.reputation)).toBe(3.0);

    const updatedFeedbackData = {
      rating: 5,
      comment: 'El evento fue excelente después de todo.'
    };

    await request(app)
      .patch(`/api/event-feedback/${feedback.id}`)
      .send(updatedFeedbackData)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);

    const updatedGroup = await prisma.group.findUnique({
      where: {
        id: group.id
      }
    });

    expect(Number(updatedGroup.reputation)).toBe(5.0);
  });

  it('Debería retornar 400 al intentar editar un feedback de otra persona', async () => {
    const response = await request(app)
      .patch(`/api/event-feedback/${feedback.id}`)
      .send({ rating: 2, comment: 'Intento de edición no autorizado.' })
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: representativeUser.auth0_id, email: representativeUser.email })}`);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No se puede actualizar el feedback de otro estudiante');
  });

  it('Debería poder actualizar feedback siendo admin', async () => {
    const adminUser = await testHelper.createAdminUser('admin-user');
    const response = await request(app)
      .patch(`/api/event-feedback/admin/${feedback.id}`)
      .send({ rating: 4, comment: 'Edición realizada por admin.' })
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: adminUser.auth0_id, email: adminUser.email })}`);

    expect(response.status).toBe(200);
    expect(Number(response.body.rating)).toBe(4);
  });

  //   it('Debería retornar al intentar editar un feedback sin ser admin', async () => {
  //     const response = await request(app)
  //         .patch(`/api/event-feedback/admin/${feedback.id}`)
  //         .send({ rating: 1, comment: 'Intento de edición no autorizado por admin.' })
  //         .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);
    
  //     expect(response.status).toBe(400);
  //   });

});

describe('DELETE /event-feedback - Asegurar eliminación de feedbacks', () => {

  let representativeUser, normalUser, groupRequest, group, eventRequest, publicSpace, feedback;

  beforeEach(async() => {
    await testHelper.clearDatabase();
    representativeUser = await testHelper.createStudentUser('representative-user');
    normalUser =  await testHelper.createStudentUser('normal-user');
    groupRequest = await testHelper.createConfirmedGroupRequest(representativeUser.id);
    group = await testHelper.createGroup(representativeUser.id, groupRequest.id, 4.0);
    publicSpace = await testHelper.createPublicSpace();
    eventRequest = await testHelper.createEventRequest(group.id, publicSpace.id);
    feedback = await testHelper.createFeedback(eventRequest.id, normalUser.id, 4, 'El evento estuvo bien.');
  });

  it('Debería permitir a un estudiante eliminar su feedback', async () => {
    const response = await request(app)
      .delete(`/api/event-feedback/${feedback.id}`)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);
        
    expect(response.status).toBe(204);
    const deletedFeedback = await prisma.feedback.findUnique({
      where: {
        id: feedback.id
      }
    });
    expect(deletedFeedback).toBeNull();
  });

  it ('La reputación del grupo debería actualizarse al eliminar un feedback', async () => {
    await request(app)
      .post('/api/event-feedback')
      .send({
        event_id: eventRequest.id,
        student_id: representativeUser.id,
        rating: 2,
        comment: 'No me gustó el evento.'
      })
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: representativeUser.auth0_id, email: representativeUser.email })}`);
        
    const originalGroup2 = await prisma.group.findUnique({
      where: {
        id: group.id
      }
    });
    expect(Number(originalGroup2.reputation)).toBe(3.0);
    await request(app)
      .delete(`/api/event-feedback/${feedback.id}`)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: normalUser.auth0_id, email: normalUser.email })}`);
        
    const updatedGroup = await prisma.group.findUnique({
      where: {
        id: group.id
      }
    });
    expect(Number(updatedGroup.reputation)).toBe(2.0);
  });

  it('Debería retornar 400 al intentar eliminar un feedback de otra persona', async () => {
    const response = await request(app)
      .delete(`/api/event-feedback/${feedback.id}`)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: representativeUser.auth0_id, email: representativeUser.email })}`);
        
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No se puede eliminar el feedback de otro estudiante');
  });

  it('Debería poder eliminar un feedback siendo admin', async () => {
    const adminUser = await testHelper.createAdminUser('admin-user');
    const response = await request(app)
      .delete(`/api/event-feedback/admin/${feedback.id}`)
      .set('Authorization', `Bearer user-json:${JSON.stringify({ sub: adminUser.auth0_id, email: adminUser.email })}`);
        
    expect(response.status).toBe(204);
    const deletedFeedback = await prisma.feedback.findUnique({
      where: {
        id: feedback.id
      }
    });
    expect(deletedFeedback).toBeNull();
  });
});