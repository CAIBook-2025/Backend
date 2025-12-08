const request = require('supertest');
const app = require('../src/app');
const { prisma } = require('../src/lib/prisma');

describe('Soft Delete de un User', () => {

  let createdUserId;
  let createdGroupRequestId;
  let createdGroupId;
  let createdEventRequestId;

  beforeEach(async () => {
    // Limpiar datos antes del test
    await prisma.feedback.deleteMany({});
    await prisma.eventRequest.deleteMany({});
    await prisma.group.deleteMany({});
    await prisma.groupRequest.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.publicSpace.deleteMany({});

    const user = await prisma.user.create({
      data: {
        auth0_id: 'auth0|testuser1',
        email: 'testuser1@example.com',
        first_name: 'Test',
        last_name: 'Testínez',
        career: 'Tester',
        phone: '1234567890',
        student_number: '20202020'
      }
    });
    createdUserId = user.id;

    const groupRequest = await prisma.groupRequest.create({
      data: {
        user_id: createdUserId,
        name: 'Test Group',
        goal: 'Testing',
        description: 'Group for testing soft delete'
      }
    });
    createdGroupRequestId = groupRequest.id;

    const group = await prisma.group.create({
      data: {
        repre_id: createdUserId,
        group_request_id: createdGroupRequestId,
        reputation: 4.5
      }
    });
    createdGroupId = group.id;

    const publicSpace = await prisma.publicSpace.create({
      data: {
        name: 'Test Space',
        capacity: 50,
        location: 'Test Location',
        available: 'AVAILABLE'
      }
    });

    const eventRequest = await prisma.eventRequest.create({
      data: {
        group_id: createdGroupId,
        public_space_id: publicSpace.id,
        name: 'Test Event',
        goal: 'Testing Event',
        description: 'Event for testing soft delete',
        day: new Date(),
        module: 1,
        status: 'CONFIRMED'
      }
    });
    createdEventRequestId = eventRequest.id;

    await prisma.feedback.create({
      data: {
        event_id: createdEventRequestId,
        student_id: createdUserId,
        rating: 5,
        comment: 'wow!'
      }
    });

    await request(app)
      .patch(`/api/users/admin/delete/${createdUserId}`)
      .set('Authorization', 'Bearer valid-jwt-token')
      .expect(200);
    
  });

  it('Soft delete en cascada de User debería afectar todas las entidades', async () => {
        
    const deletedUser = await prisma.user.findUnique({
      where: { id: createdUserId }
    });
    expect(deletedUser.is_deleted).toBe(true);

    const deletedGroupRequest = await prisma.groupRequest.findUnique({
      where: { id: createdGroupRequestId }
    });
    expect(deletedGroupRequest.is_deleted).toBe(true);

    const deletedGroup = await prisma.group.findUnique({
      where: { id: createdGroupId }
    });
    expect(deletedGroup.is_deleted).toBe(true);

    const deletedEventRequest = await prisma.eventRequest.findUnique({
      where: { id: createdEventRequestId }
    });
    expect(deletedEventRequest.is_deleted).toBe(true);

    const deletedFeedbacks = await prisma.feedback.findMany({
      where: { event_id: createdEventRequestId }
    });
    expect(deletedFeedbacks.length).toBe(0);
        
  });

  // it('Soft delete GroupRequest y recursos asociados')

  // it('Soft delete Group y recursos asociados')

  // it('Soft delete EventRequest y recursos asociados')

  // it('No debería permitir operaciones con recursos soft deleteados')

  // it('No debería poder loggearme como usuario soft deleteado')

});

describe('Soft Delete de una Group Request', () => {});