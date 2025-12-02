const { Router } = require('express');
const { checkJwt } = require('../middleware/auth');
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

// POST /event-feedback

// PATCH /event-feedback/:eventFeedbackId

// DELETE /event-feedback/:eventFeedbackId

module.exports = router; 