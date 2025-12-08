const cron = require('node-cron');
const { prisma } = require('../lib/prisma');
const { MODULE_HOURS, CHECKIN_GRACE_MINUTES } = require('../config/moduleHours');

/**
 * Obtiene la fecha/hora límite para hacer check-in de un módulo específico
 * @param {Date} day - Fecha de la reserva
 * @param {number} moduleNum - Número del módulo (1-9)
 * @returns {Date|null} - Fecha límite para check-in o null si módulo inválido
 */
function getCheckInDeadline(day, moduleNum) {
  const moduleTime = MODULE_HOURS[moduleNum];
  if (!moduleTime) return null;

  const deadline = new Date(day);
  // Establecer la hora de inicio del módulo + tiempo de gracia
  const totalMinutes = moduleTime.start.minute + CHECKIN_GRACE_MINUTES;
  const extraHours = Math.floor(totalMinutes / 60);
  const finalMinutes = totalMinutes % 60;

  deadline.setHours(
    moduleTime.start.hour + extraHours,
    finalMinutes,
    0,
    0
  );

  return deadline;
}

/**
 * Procesa las reservas que no hicieron check-in a tiempo
 * - Libera la sala al estado original (available = AVAILABLE, status = PENDING, user_id = null)
 * - Crea un Strike de tipo NO_SHOW para el usuario que no apareció
 */
async function processNoShows() {
  const now = new Date();
  console.log(`[CheckInVerifier] Ejecutando verificación: ${now.toISOString()}`);

  try {
    // 1. Buscar reservas pendientes de check-in (sala reservada pero sin check-in)
    const pendingReservations = await prisma.sRScheduling.findMany({
      where: {
        available: 'UNAVAILABLE',
        status: 'PENDING',
        is_finished: false,
        user_id: { not: null }
      },
      include: {
        user: true,
        studyRoom: true
      }
    });

    console.log(`[CheckInVerifier] Reservas pendientes encontradas: ${pendingReservations.length}`);

    let releasedCount = 0;

    for (const reservation of pendingReservations) {
      const deadline = getCheckInDeadline(reservation.day, reservation.module);

      if (!deadline) {
        console.warn(`[CheckInVerifier] Módulo ${reservation.module} no configurado, saltando reserva #${reservation.id}`);
        continue;
      }

      // Si ya pasó el tiempo límite de check-in
      if (now > deadline) {
        console.log('[CheckInVerifier] No-show detectado:');
        console.log(`  - Reserva ID: #${reservation.id}`);
        console.log(`  - Usuario: ${reservation.user?.email || 'N/A'}`);
        console.log(`  - Sala: ${reservation.studyRoom?.name || reservation.sr_id}`);
        console.log(`  - Módulo: ${reservation.module}`);
        console.log(`  - Fecha: ${reservation.day.toISOString().split('T')[0]}`);
        console.log(`  - Deadline era: ${deadline.toISOString()}`);

        // Guardar user_id antes de liberarla
        const userId = reservation.user_id;

        // Usar transacción para garantizar consistencia
        await prisma.$transaction(async (tx) => {
          // Liberar la sala al estado original/limpio
          await tx.sRScheduling.update({
            where: { id: reservation.id },
            data: {
              status: 'PENDING',
              available: 'AVAILABLE',
              user_id: null
            }
          });

          // Buscar un admin del sistema para registrar el strike automático
          const systemAdmin = await tx.user.findFirst({
            where: { role: 'ADMIN', is_deleted: false },
            orderBy: { id: 'asc' }
          });

          // Crear strike por no-show (si hay admin y había usuario)
          if (systemAdmin && userId) {
            await tx.strike.create({
              data: {
                student_id: userId,
                admin_id: 1,
                type: 'NO_SHOW',
                description: `No-show automático: Sala "${reservation.studyRoom?.name || 'ID:' + reservation.sr_id}", Módulo ${reservation.module}, Fecha ${reservation.day.toISOString().split('T')[0]}`
              }
            });
            console.log(`[CheckInVerifier] Strike NO_SHOW creado para usuario ID: ${userId}`);
          } else if (!systemAdmin) {
            console.warn('[CheckInVerifier] No se encontró admin para crear strike automático');
          }
        });

        releasedCount++;
      }
    }

    if (releasedCount > 0) {
      console.log(`[CheckInVerifier] ✅ Salas liberadas por no-show: ${releasedCount}`);
    } else {
      console.log('[CheckInVerifier] ✅ No hay no-shows pendientes');
    }

  } catch (error) {
    console.error('[CheckInVerifier] ❌ Error:', error);
  }
}

/**
 * Inicia el cron-job de verificación de check-in
 * Se ejecuta cada 10 minutos
 */
function startCheckInVerifier() {
  // Expresión cron: "*/10 * * * *" = cada 10 minutos
  const task = cron.schedule('*/10 * * * *', processNoShows, {
    scheduled: true,
    timezone: 'America/Santiago' // Zona horaria de Chile
  });

  console.log('✅ CheckInVerifier cron-job iniciado (cada 10 minutos)');

  // Ejecutar una vez al iniciar para procesar pendientes inmediatamente
  processNoShows();

  return task;
}

module.exports = { startCheckInVerifier, processNoShows, getCheckInDeadline };

