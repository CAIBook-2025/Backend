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

  // async getEventFeedbackByEventId(event_id) {
  //     return await prisma.eventFeedback.findMany({
  //         where: { event_id: event_id },
  //     });
  // }

  // async getEventFeedbackByGroupId(groupId) {
  //     return await prisma.eventFeedback.findMany({
  //         where: { groupId: groupId },
  //     });
  // }

  // async getEventFeedbackByUserId(student_id) {
  //     return await prisma.eventFeedback.findMany({
  //         where: { student_id: student_id },
  //     });
  // }

  async createEventFeedback(feedbackData) {
    const { event_id, student_id, rating, comment } = feedbackData;

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

}

module.exports = new EventFeedbackService();