const { prisma } = require('../../lib/prisma');
const { Prisma } = require('@prisma/client');
const { NotFoundError, BadRequestError, ConflictError } = require('../../utils/appError');

class EventFeedbackService {

  async getAllEventFeedback() {
    return await prisma.feedback.findMany();
  }

  async getEventFeedbackById(eventFeedbackId) {
    const eventFeedback = await prisma.feedback.findUnique({
      where: { id: eventFeedbackId },
    });
    if (!eventFeedback) {
      throw new NotFoundError('Feedback no encontrado', 'EventFeedbackService.getEventFeedbackById');
    }
    return eventFeedback;
  }

  async getEventFeedbackByEventId(event_id) {
    const event = await prisma.eventRequest.findUnique({
      where: { id: event_id, is_deleted: false },
    });
    if (!event) {
      throw new NotFoundError('Evento no encontrado', 'EventFeedbackService.getEventFeedbackByEventId');
    }
    const eventFeedbacksOfEvent = await prisma.feedback.findMany({
      where: { event_id: event_id },
    });
    return eventFeedbacksOfEvent;
  }

  async getEventFeedbackByGroupId(group_id) {
    const group = await prisma.group.findUnique({
      where: { id: group_id, is_deleted: false },
    });
    if (!group) {
      throw new NotFoundError('Grupo no encontrado', 'EventFeedbackService.getEventFeedbackByGroupId');
    }
    const eventsOfGroup = await prisma.eventRequest.findMany({
      where: { group_id: group_id, is_deleted: false },
      select: { id: true },
    });
    const eventIds = eventsOfGroup.map(event => event.id);
    const eventFeedbacksOfGroup = await prisma.feedback.findMany({
      where: { event_id: { in: eventIds } },
    });
    return eventFeedbacksOfGroup;
  }

  async getEventFeedbackByUserId(student_id) {
    const student = await prisma.user.findUnique({
      where: { id: student_id, is_deleted: false },
    });
    if (!student) {
      throw new NotFoundError('Estudiante no encontrado', 'EventFeedbackService.getEventFeedbackByUserId');
    }
    const eventFeedbacksOfStudent = await prisma.feedback.findMany({
      where: { student_id: student_id },
    });
    return eventFeedbacksOfStudent;
  }

  async createEventFeedback(feedbackData, student_auth0_id) {
    const { event_id, rating, comment } = feedbackData;

    if (event_id === undefined) {
      throw new BadRequestError('El ID del evento es obligatorio', 'EventFeedbackService.createEventFeedback');
    } 
    
    if (rating === undefined) {
      throw new BadRequestError('La calificación es obligatoria', 'EventFeedbackService.createEventFeedback');
    }

    const sanitizedEventId = Number(event_id);
    if (!Number.isInteger(sanitizedEventId) || sanitizedEventId <= 0) {
      throw new BadRequestError('El ID del evento es inválido', 'EventFeedbackService.createEventFeedback');
    }
        
    const eventExists = await prisma.eventRequest.findUnique({
      where: { id: sanitizedEventId, is_deleted: false },
    });
    if (!eventExists) {
      throw new NotFoundError('Evento no encontrado', 'EventFeedbackService.createEventFeedback');
    }

    const student = await prisma.user.findUnique({
      where: { auth0_id: student_auth0_id, is_deleted: false },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundError('Estudiante no encontrado', 'EventFeedbackService.createEventFeedback');
    }
    const sanitizedStudentId = student.id;

    const eventFeedbackOfStudentOfThisEvent = await prisma.feedback.findFirst({
      where: {
        event_id: sanitizedEventId,
        student_id: sanitizedStudentId,
      },
      select: { id: true },
    });
    if (eventFeedbackOfStudentOfThisEvent) {
      throw new ConflictError('El estudiante ya ha proporcionado feedback para este evento', 'EventFeedbackService.createEventFeedback');
    }

    const numericRating = Number(rating);

    if (!Number.isFinite(numericRating)) {
      throw new BadRequestError('La calificación debe ser un número válido', 'EventFeedbackService.createEventFeedback');
    }

    if (numericRating < 1.0 || numericRating > 5.0) {
      throw new BadRequestError('La calificación debe estar entre 1 y 5', 'EventFeedbackService.createEventFeedback');
    }

    const sanitizedRating = new Prisma.Decimal(numericRating.toFixed(1));

    const sanitizedComment = typeof comment === 'string' && comment.trim() !== '' ? comment.trim() : null;

    const sanitizedGroupId = eventExists.group_id;

    return await prisma.$transaction(async (tx) => {
      const createdFeedback = await tx.feedback.create({
        data: {
          event_id: sanitizedEventId,
          student_id: sanitizedStudentId,
          rating: sanitizedRating,
          comment: sanitizedComment,
        },
      });

      const eventsOfGroup = await tx.eventRequest.findMany({
        where: { group_id: sanitizedGroupId, is_deleted: false },
        select: { id: true },
      });
      const eventIds = eventsOfGroup.map(event => event.id);

      const aggregateAvg = await tx.feedback.aggregate({
        where: { event_id: { in: eventIds } },
        _avg: {
          rating: true,
        },
      });

      const averageRating = aggregateAvg._avg.rating ? aggregateAvg._avg.rating.toFixed(1) : 0;

      await tx.group.update({
        where: { id: sanitizedGroupId },
        data: { 
          reputation: averageRating ? new Prisma.Decimal(averageRating) : 0
        },
      });

      return createdFeedback;

    });
  }

  async updateOwnEventFeedback(eventFeedbackId, feedbackData, student_auth0_id) {
    const student = await prisma.user.findUnique({
      where: { auth0_id: student_auth0_id, is_deleted: false },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundError('Estudiante no encontrado', 'EventFeedbackService.updateOwnEventFeedback');
    }
    const sanitizedStudentId = student.id;

    const existingFeedback = await prisma.feedback.findUnique({
      where: { id: eventFeedbackId },
    });
    if (!existingFeedback) {
      throw new NotFoundError('Feedback no encontrado', 'EventFeedbackService.updateOwnEventFeedback');
    }
    if (existingFeedback.student_id !== sanitizedStudentId) {
      throw new BadRequestError('No se puede actualizar el feedback de otro estudiante', 'EventFeedbackService.updateOwnEventFeedback');
    }

    const { rating, comment } = feedbackData;
    const updateData = {};

    if (rating !== undefined) {
      const numericRating = Number(rating);

      if (!Number.isFinite(numericRating)) {
        throw new BadRequestError('La calificación debe ser un número válido', 'EventFeedbackService.updateEventFeedback');
      }

      if (numericRating < 1.0 || numericRating > 5.0) {
        throw new BadRequestError('La calificación debe estar entre 1 y 5', 'EventFeedbackService.updateEventFeedback');
      }

      updateData.rating = new Prisma.Decimal(numericRating.toFixed(1));
    }

    if (comment !== undefined) {
      if (comment === null || (typeof comment === 'string' && comment.trim() === '')) {
        updateData.comment = null;
      } else if (typeof comment === 'string') {
        updateData.comment = comment.trim();
      } else {
        throw new BadRequestError('El comentario debe ser una cadena de texto o nulo', 'EventFeedbackService.updateEventFeedback');
      }
    }

    const sanitizedGroupId = existingFeedback.event_id;

    return await prisma.$transaction(async (tx) => {
      const updatedFeedback = await tx.feedback.update({
        where: { id: eventFeedbackId },
        data: updateData,
      });

      const eventsOfGroup = await tx.eventRequest.findMany({
        where: { group_id: sanitizedGroupId, is_deleted: false },
        select: { id: true },
      });
      const eventIds = eventsOfGroup.map(event => event.id);

      const aggregateAvg = await tx.feedback.aggregate({
        where: { event_id: { in: eventIds } },
        _avg: {
          rating: true,
        },
      });

      const averageRating = aggregateAvg._avg.rating ? aggregateAvg._avg.rating.toFixed(1) : 0;

      await tx.group.update({
        where: { id: sanitizedGroupId },
        data: { 
          reputation: averageRating ? new Prisma.Decimal(averageRating) : 0
        },
      });

      return updatedFeedback;
    });
  }

  async updateAdminEventFeedback(eventFeedbackId, feedbackData) {
    const existingFeedback = await prisma.feedback.findUnique({
      where: { id: eventFeedbackId },
    });
    if (!existingFeedback) {
      throw new NotFoundError('Feedback no encontrado', 'EventFeedbackService.updateEventFeedback');
    }
    const { rating, comment } = feedbackData;
    const updateData = {};

    if (rating !== undefined) {
      const numericRating = Number(rating);

      if (!Number.isFinite(numericRating)) {
        throw new BadRequestError('La calificación debe ser un número válido', 'EventFeedbackService.updateEventFeedback');
      }

      if (numericRating < 1.0 || numericRating > 5.0) {
        throw new BadRequestError('La calificación debe estar entre 1 y 5', 'EventFeedbackService.updateEventFeedback');
      }

      updateData.rating = new Prisma.Decimal(numericRating.toFixed(1));
    }

    if (comment !== undefined) {
      if (comment === null || (typeof comment === 'string' && comment.trim() === '')) {
        updateData.comment = null;
      } else if (typeof comment === 'string') {
        updateData.comment = comment.trim();
      } else {
        throw new BadRequestError('El comentario debe ser una cadena de texto o nulo', 'EventFeedbackService.updateEventFeedback');
      }
    }

    const sanitizedGroupId = existingFeedback.event_id;

    return await prisma.$transaction(async (tx) => {
      const updatedFeedback = await tx.feedback.update({
        where: { id: eventFeedbackId },
        data: updateData,
      });

      const eventsOfGroup = await tx.eventRequest.findMany({
        where: { group_id: sanitizedGroupId, is_deleted: false },
        select: { id: true },
      });
      const eventIds = eventsOfGroup.map(event => event.id);

      const aggregateAvg = await tx.feedback.aggregate({
        where: { event_id: { in: eventIds } },
        _avg: {
          rating: true,
        },
      });

      const averageRating = aggregateAvg._avg.rating ? aggregateAvg._avg.rating.toFixed(1) : 0;

      await tx.group.update({
        where: { id: sanitizedGroupId },
        data: { 
          reputation: averageRating ? new Prisma.Decimal(averageRating) : 0
        },
      });

      return updatedFeedback;
    });
  }

  async deleteEventFeedbackByStudent(eventFeedbackId, student_auth0_id) {
    const student = await prisma.user.findUnique({
      where: { auth0_id: student_auth0_id, is_deleted: false },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundError('Estudiante no encontrado', 'EventFeedbackService.deleteEventFeedbackByStudent');
    }
    const sanitizedStudentId = student.id;

    const existingFeedback = await prisma.feedback.findUnique({
      where: { id: eventFeedbackId },
    });
    if (!existingFeedback) {
      throw new NotFoundError('Feedback no encontrado', 'EventFeedbackService.deleteEventFeedbackByStudent');
    }
    if (existingFeedback.student_id !== sanitizedStudentId) {
      throw new BadRequestError('No se puede eliminar el feedback de otro estudiante', 'EventFeedbackService.deleteEventFeedbackByStudent');
    }

    await prisma.$transaction(async (tx) => {
      await tx.feedback.delete({
        where: { id: eventFeedbackId },
      });

      const sanitizedEventId = existingFeedback.event_id;

      const event = await tx.eventRequest.findUnique({
        where: { id: sanitizedEventId, is_deleted: false},
      });
      const sanitizedGroupId = event.group_id;

      const eventsOfGroup = await tx.eventRequest.findMany({
        where: { group_id: sanitizedGroupId, is_deleted: false },
        select: { id: true },
      });
      const eventIds = eventsOfGroup.map(event => event.id);

      const aggregateAvg = await tx.feedback.aggregate({
        where: { event_id: { in: eventIds } },
        _avg: {
          rating: true,
        },
      });

      const averageRating = aggregateAvg._avg.rating ? aggregateAvg._avg.rating.toFixed(1) : 0;

      await tx.group.update({
        where: { id: sanitizedGroupId },
        data: { 
          reputation: averageRating ? new Prisma.Decimal(averageRating) : 0
        },
      });
    });
  }

  async deleteEventFeedbackByAdmin(eventFeedbackId) {
    const existingFeedback = await prisma.feedback.findUnique({
      where: { id: eventFeedbackId },
    });
    if (!existingFeedback) {
      throw new NotFoundError('Feedback no encontrado', 'EventFeedbackService.deleteEventFeedbackByAdmin');
    }
    await prisma.$transaction(async (tx) => {
      await tx.feedback.delete({
        where: { id: eventFeedbackId },
      });

      const sanitizedEventId = existingFeedback.event_id;

      const event = await tx.eventRequest.findUnique({
        where: { id: sanitizedEventId, is_deleted: false},
      });
      const sanitizedGroupId = event.group_id;

      const eventsOfGroup = await tx.eventRequest.findMany({
        where: { group_id: sanitizedGroupId, is_deleted: false },
        select: { id: true },
      });
      const eventIds = eventsOfGroup.map(event => event.id);

      const aggregateAvg = await tx.feedback.aggregate({
        where: { event_id: { in: eventIds } },
        _avg: {
          rating: true,
        },
      });

      const averageRating = aggregateAvg._avg.rating ? aggregateAvg._avg.rating.toFixed(1) : 0;

      await tx.group.update({
        where: { id: sanitizedGroupId },
        data: { 
          reputation: averageRating ? new Prisma.Decimal(averageRating) : 0
        },
      });
    });
  }
}

module.exports = new EventFeedbackService();