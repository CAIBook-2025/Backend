/**
 * Configuración de horarios de módulos universitarios
 * Cada módulo tiene su hora de inicio y fin
 */
const MODULE_HOURS = {
  1: { start: { hour: 8, minute: 20 }, end: { hour: 9, minute: 30 } },
  2: { start: { hour: 9, minute: 40 }, end: { hour: 10, minute: 50 } },
  3: { start: { hour: 11, minute: 0 }, end: { hour: 12, minute: 10 } },
  4: { start: { hour: 12, minute: 20 }, end: { hour: 13, minute: 30 } },
  5: { start: { hour: 14, minute: 50 }, end: { hour: 16, minute: 0 } },
  6: { start: { hour: 16, minute: 10 }, end: { hour: 17, minute: 20 } },
  7: { start: { hour: 17, minute: 30 }, end: { hour: 18, minute: 40 } },
  8: { start: { hour: 18, minute: 50 }, end: { hour: 20, minute: 0 } },
  9: { start: { hour: 20, minute: 10 }, end: { hour: 21, minute: 20 } },
};

// Minutos de gracia después de la hora de inicio para hacer check-in
const CHECKIN_GRACE_MINUTES = 10;

module.exports = { MODULE_HOURS, CHECKIN_GRACE_MINUTES };

