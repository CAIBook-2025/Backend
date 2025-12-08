const { Prisma } = require('@prisma/client');
const { prisma } = require('../../lib/prisma');
const { NotFoundError, BadRequestError } = require('../../utils/appError');

class EventRequestDeleter {
  async softDeleteEventRequestById(event_request_id, student_auth0_id) {
    const eventRequest = await this.getEventRequestById(event_request_id);
    const groupOfEventRequest = await this.getGroupOfEventRequest(eventRequest);
    const representativeUser = await this.getRepresentativeUserByAuth0Id(student_auth0_id);
    this.checkIfUserIsRepresentativeOfGroup(groupOfEventRequest, representativeUser);
    await this.deleteEventResourcesFeedback(eventRequest);
    return { message: 'Solicitud de evento eliminada correctamente', eventRequest: eventRequest };
  }

  async adminSoftDeleteEventRequestById(event_request_id) {
    const eventRequest = await this.getEventRequestById(event_request_id);
    await this.deleteEventResourcesFeedback(eventRequest);
    return { message: 'Solicitud de evento eliminada correctamente', eventRequest: eventRequest };
  }

  async getEventRequestById(event_request_id) {
    const eventRequest = await prisma.eventRequest.findUnique({
      where: { id: event_request_id, is_deleted: false },
    });

    if (!eventRequest) {
      throw new NotFoundError('Evento no encontrado');
    }

    return eventRequest;
  }

  async getGroupOfEventRequest(eventRequest) {
    const group = await prisma.group.findUnique({
      where: { id: eventRequest.group_id, is_deleted: false },
    });

    if (!group) {
      throw new NotFoundError('Grupo no encontrado');
    }

    return group;
  }

  async getRepresentativeUserByAuth0Id(student_auth0_id) {
    const representativeUser = await prisma.user.findUnique({
      where: { auth0_id: student_auth0_id, is_deleted: false },
    });

    if (!representativeUser) {
      throw new NotFoundError('Usuario representante no encontrado');
    }

    return representativeUser;
  }

  checkIfUserIsRepresentativeOfGroup(group, representativeUser) {
    if (group.repre_id !== representativeUser.id) {
      throw new BadRequestError('El usuario no es el representante de la solicitud de evento');
    }
  }

  async deleteEventResourcesFeedback(eventRequest) {
    const event_request_id = eventRequest.id;
    await prisma.$transaction(async (tx) => {
      await this.softDeleteEventRequestInDB(tx, event_request_id);
      await this.deleteEventFeedbacksInDB(tx, event_request_id);
      const groupOfEventRequest = await this.getGroupOfEventRequestInTransaction(tx, eventRequest);
      await this.updateGroupReputation(tx, groupOfEventRequest);
    });
  }

  async softDeleteEventRequestInDB(tx, event_request_id) {
    return await tx.eventRequest.update({
      where: { id: event_request_id, is_deleted: false },
      data: { is_deleted: true, deletedAt: new Date() },
    });
  }

  async deleteEventFeedbacksInDB(tx, event_request_id) {
    await tx.feedback.deleteMany({
      where: { event_id: event_request_id },
    });
  }

  async getGroupOfEventRequestInTransaction(tx, eventRequest) {
    const group = await tx.group.findUnique({
      where: { id: eventRequest.group_id, is_deleted: false },
    });

    if (!group) {
      throw new NotFoundError('Grupo no encontrado');
    }

    return group;
  }

  async updateGroupReputation(tx, group) {
    if (!group) return;
    const eventRequestsInGroup = await tx.eventRequest.findMany({
      where: { group_id: group.id, is_deleted: false },
    });
    const eventIds = eventRequestsInGroup.map((eventRequest) => eventRequest.id);
    const aggregateAvg = await tx.feedback.aggregate({
      where: { event_id: { in: eventIds } },
      _avg: { rating: true },
    });
    const newAvgRating = aggregateAvg._avg.rating? aggregateAvg._avg.rating.toFixed(1) : 0;
    await tx.group.update({
      where: { id: group.id, is_deleted: false },
      data: { reputation: newAvgRating ? new Prisma.Decimal(newAvgRating) : 0 },
    });
  }
}

module.exports = new EventRequestDeleter();