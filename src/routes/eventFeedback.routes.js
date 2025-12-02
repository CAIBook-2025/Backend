const { Router } = require('express');
const { checkJwt, checkAdmin } = require('../middleware/auth');
const eventFeedbackService = require('../eventFeedbackServices/eventFeedbackService');
const errorHandler = require('../utils/errorHandler');

const router = Router();

// GET /event-feedback/:eventFeedbackId
router.get('/:eventFeedbackId', checkJwt, async (req, res) => {
  try {
    const result = await eventFeedbackService.getEventFeedbackById(Number(req.params.eventFeedbackId));
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'GET /event-feedback/:eventFeedbackId', 'No se pudo obtener el feedback del evento');
  }
});

// GET /event-feedback/event/:eventId
router.get('/event/:eventId', checkJwt, async (req, res) => {
  try {
    const result = await eventFeedbackService.getEventFeedbackByEventId(Number(req.params.eventId));
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'GET /event-feedback/event/:eventId', 'No se pudo obtener el feedback del evento por eventId');
  }
});

// GET /event-feedback/group/:groupId
router.get('/group/:groupId', checkJwt, async (req, res) => {
  try {
    const result = await eventFeedbackService.getEventFeedbackByGroupId(Number(req.params.groupId));
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'GET /event-feedback/group/:groupId', 'No se pudo obtener el feedback del evento por groupId');
  }
});

// GET /event-feedback/user/:userId
router.get('/user/:userId', checkJwt, async (req, res) => {
  try {
    const result = await eventFeedbackService.getEventFeedbackByUserId(Number(req.params.userId));
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'GET /event-feedback/user/:userId', 'No se pudo obtener el feedback del evento por userId');
  }
});

// POST /event-feedback
router.post('/', checkJwt, async (req, res) => {
  try {
    const feedbackData = req.body;
    const result = await eventFeedbackService.createEventFeedback(feedbackData);
    res.status(201).json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'POST /event-feedback', 'No se pudo crear el feedback del evento');
  }
});

// PATCH /event-feedback/:eventFeedbackId
router.patch('/:eventFeedbackId', checkJwt, checkAdmin, async (req, res) => {
  try {
    const feedbackData = req.body;
    const result = await eventFeedbackService.updateEventFeedback(Number(req.params.eventFeedbackId), feedbackData);
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'PATCH /event-feedback/:eventFeedbackId', 'No se pudo actualizar el feedback del evento');
  }
});

// DELETE /event-feedback/:eventFeedbackId

module.exports = router; 