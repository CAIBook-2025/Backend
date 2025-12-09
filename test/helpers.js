const { prisma } = require('../src/lib/prisma');

class testHelper {

  async clearDatabase() {
    await prisma.feedback.deleteMany();
    await prisma.eventRequest.deleteMany();
    await prisma.groupRequest.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
  }

  async createAdminUser() {
    return await prisma.user.create({
      data: {
        auth0_id: 'auth0|admin-user',
        email: 'admin-user@example.com',
        first_name: 'Admin',
        last_name: 'User',
        career: 'Administration',
        phone: '9999999999',
        student_number: 'ADM-001',
        role: 'ADMIN'
      }
    });
  }

  async createStudentUser(id = 'student-user') {
    return await prisma.user.create({
      data: {
        auth0_id: `auth0|${id}`,
        email: `${id}@example.com`,
        first_name: 'Normal',
        last_name: 'User',
        career: 'Engineering',
        phone: '5555555556',
        student_number: 'NU-001',
      }
    });
  }

  async createConfirmedGroupRequest(userId) {
    return await prisma.groupRequest.create({
      data: {
        name: 'Feedback Test Group',
        goal: 'Testing feedback functionality',
        description: 'Group created for testing event feedback features',
        user_id: userId,
        status: 'CONFIRMED'
      }
    });
  }

  async createGroup(repreId, groupRequestId, reputacion = 5.0) {
    return await prisma.group.create({
      data: {
        repre_id: repreId,
        group_request_id: groupRequestId,
        reputation: reputacion
      }
    });
  }

  async createPublicSpace() {
    return await prisma.publicSpace.create({
      data: {
        name: 'Feedback Test Space',
        location: 'Test Location',
        capacity: 50,
        available: 'AVAILABLE'
      }
    });
  }

  async createEventRequest(groupId, publicSpaceId) {
    return await prisma.eventRequest.create({
      data: {
        group_id: groupId,
        public_space_id: publicSpaceId,
        name: 'Feedback Test Event',
        goal: 'Test event for feedback',
        description: 'Event created to test feedback submission and retrieval',
        day: new Date(),
        module: 2,
        status: 'CONFIRMED'
      }
    });
  }

  async createFeedback(eventId, studentId, rating = 4, comment = 'Great event!') {
    return await prisma.feedback.create({
      data: {
        event_id: eventId,
        student_id: studentId,
        rating: rating,
        comment: comment
      }
    });
  }
}

module.exports = new testHelper();