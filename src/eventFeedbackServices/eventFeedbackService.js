const { Prisma } = require('@prisma/client');
const { prisma } = require('../lib/prisma');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/appError');

class EventFeedbackService {

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
      where: { id: event_id },
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
      where: { id: group_id },
    });
    if (!group) {
      throw new NotFoundError('Grupo no encontrado', 'EventFeedbackService.getEventFeedbackByGroupId');
    }
    const eventsOfGroup = await prisma.eventRequest.findMany({
      where: { group_id: group_id },
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
      where: { id: student_id },
    });
    if (!student) {
      throw new NotFoundError('Estudiante no encontrado', 'EventFeedbackService.getEventFeedbackByUserId');
    }
    const eventFeedbacksOfStudent = await prisma.feedback.findMany({
      where: { student_id: student_id },
    });
    return eventFeedbacksOfStudent;
  }

  async createEventFeedback(feedbackData) {
    const { event_id, student_id, rating, comment } = feedbackData;

    if (event_id === undefined) {
      throw new BadRequestError('El ID del evento es obligatorio', 'EventFeedbackService.createEventFeedback');
    } 

    if (student_id === undefined) {
      throw new BadRequestError('El ID del estudiante es obligatorio', 'EventFeedbackService.createEventFeedback');
    }
    
    if (rating === undefined) {
      throw new BadRequestError('La calificación es obligatoria', 'EventFeedbackService.createEventFeedback');
    }

    const sanitizedEventId = Number(event_id);
    if (!Number.isInteger(sanitizedEventId) || sanitizedEventId <= 0) {
      throw new BadRequestError('El ID del evento es inválido', 'EventFeedbackService.createEventFeedback');
    }

    const sanitizedStudentId = Number(student_id);
    if (!Number.isInteger(sanitizedStudentId) || sanitizedStudentId <= 0) {
      throw new BadRequestError('El ID del estudiante es inválido', 'EventFeedbackService.createEventFeedback');
    }
        
    const eventExists = await prisma.eventRequest.findUnique({
      where: { id: sanitizedEventId },
    });
    if (!eventExists) {
      throw new NotFoundError('Evento no encontrado', 'EventFeedbackService.createEventFeedback');
    }

    const studentExists = await prisma.user.findUnique({
      where: { id: sanitizedStudentId },
    });
    if (!studentExists) {
      throw new NotFoundError('Estudiante no encontrado', 'EventFeedbackService.createEventFeedback');
    }

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

    return await prisma.feedback.create({
      data: {
        event_id: sanitizedEventId,
        student_id: sanitizedStudentId,
        rating: sanitizedRating,
        comment: sanitizedComment,
      },
    });
  }

  async updateEventFeedback(eventFeedbackId, feedbackData) {
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

    return await prisma.feedback.update({
      where: { id: eventFeedbackId },
      data: updateData,
    });
  }

  async deleteEventFeedback(eventFeedbackId) {
    const existingFeedback = await prisma.feedback.findUnique({
      where: { id: eventFeedbackId },
    });
    if (!existingFeedback) {
      throw new NotFoundError('Feedback no encontrado', 'EventFeedbackService.deleteEventFeedback');
    }
    await prisma.feedback.delete({
      where: { id: eventFeedbackId },
    });
  }
}

module.exports = new EventFeedbackService();