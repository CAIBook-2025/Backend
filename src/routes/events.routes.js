const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const { checkJwt } = require('../middleware/auth');

const router = Router();

// GET /events - Listar todos los eventos
router.get('/', async (req, res) => {
  try {
    // Filtros opcionales
    const { status, group_id, from_date, to_date } = req.query;

    const where = {};
    
    // Filtrar por grupo a través de eventRequest
    if (group_id) {
      where.eventRequest = {
        group_id: Number(group_id)
      };
    }

    // Filtrar por rango de fechas
    if (from_date) {
      where.start_time = { 
        ...where.start_time,
        gte: new Date(from_date) 
      };
    }
    if (to_date) {
      where.start_time = { 
        ...where.start_time,
        lte: new Date(to_date) 
      };
    }

    // Filtrar por status del EventRequest
    if (status) {
      where.eventRequest = {
        ...where.eventRequest,
        status: status
      };
    }

    const items = await prisma.eventsScheduling.findMany({ 
      where,
      orderBy: { start_time: 'asc' },
      include: {
        eventRequest: {
          include: {
            group: {
              include: {
                groupRequest: {
                  select: { 
                    name: true, 
                    logo: true 
                  }
                }
              }
            },
            publicSpace: {
              select: { 
                id: true, 
                name: true, 
                capacity: true, 
                location: true,
                available: true 
              }
            }
          }
        },
        attendance: {
          include: {
            student: {
              select: { 
                id: true, 
                first_name: true, 
                last_name: true, 
                email: true 
              }
            }
          }
        }
      }
    });

    // Formatear respuesta con información del grupo
    const formattedItems = items.map(item => ({
      id: item.id,
      start_time: item.start_time,
      end_time: item.end_time,
      event_name: item.eventRequest.name,
      event_goal: item.eventRequest.goal,
      event_description: item.eventRequest.description,
      event_status: item.eventRequest.status,
      expected_attendees: item.eventRequest.n_attendees,
      actual_attendees: item.attendance.length,
      group: {
        id: item.eventRequest.group.id,
        name: item.eventRequest.group.groupRequest.name,
        logo: item.eventRequest.group.groupRequest.logo,
        reputation: item.eventRequest.group.reputation
      },
      public_space: item.eventRequest.publicSpace,
      attendance: item.attendance,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    res.json(formattedItems);
  } catch (error) {
    console.log('ERROR GET /events:', error);
    res.status(500).json({ error: 'No se pudo listar los eventos' });
  }
});

// GET /events/:id - Obtener evento específico
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const item = await prisma.eventsScheduling.findUnique({ 
      where: { id },
      include: {
        eventRequest: {
          include: {
            group: {
              include: {
                groupRequest: {
                  select: { 
                    name: true, 
                    description: true,
                    logo: true,
                    user: {
                      select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                      }
                    }
                  }
                }
              }
            },
            publicSpace: {
              select: { 
                id: true, 
                name: true, 
                capacity: true, 
                location: true,
                available: true 
              }
            }
          }
        },
        attendance: {
          include: {
            student: {
              select: { 
                id: true, 
                first_name: true, 
                last_name: true, 
                email: true,
                career: true,
                student_number: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // Calcular estadísticas de asistencia
    const attendanceStats = {
      total: item.attendance.length,
      present: item.attendance.filter(a => a.status === 'PRESENT').length,
      absent: item.attendance.filter(a => a.status === 'ABSENT').length,
      late: item.attendance.filter(a => a.status === 'LATE').length,
      pending: item.attendance.filter(a => a.status === 'PENDING').length,
      excused: item.attendance.filter(a => a.status === 'EXCUSED').length
    };

    // Calcular rating promedio si existe
    const ratingsWithValue = item.attendance.filter(a => a.rating !== null);
    const averageRating = ratingsWithValue.length > 0
      ? ratingsWithValue.reduce((sum, a) => sum + Number(a.rating), 0) / ratingsWithValue.length
      : null;

    const formatted = {
      id: item.id,
      start_time: item.start_time,
      end_time: item.end_time,
      event_request: {
        id: item.eventRequest.id,
        name: item.eventRequest.name,
        goal: item.eventRequest.goal,
        description: item.eventRequest.description,
        status: item.eventRequest.status,
        expected_attendees: item.eventRequest.n_attendees,
        day: item.eventRequest.day,
        module: item.eventRequest.module
      },
      group: {
        id: item.eventRequest.group.id,
        name: item.eventRequest.group.groupRequest.name,
        description: item.eventRequest.group.groupRequest.description,
        logo: item.eventRequest.group.groupRequest.logo,
        reputation: item.eventRequest.group.reputation,
        creator: item.eventRequest.group.groupRequest.user
      },
      public_space: item.eventRequest.publicSpace,
      attendance: item.attendance,
      attendance_stats: attendanceStats,
      average_rating: averageRating,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };

    res.json(formatted);
  } catch (error) {
    console.log('ERROR GET /events/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el evento' });
  }
});

// POST /events - Crear evento (normalmente desde EventRequest aprobado)
router.post('/', checkJwt, async (req, res) => {
  try {
    // Verificar que el usuario es admin
    const requestingUser = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub } 
    });

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Requiere permisos de administrador' });
    }

    const { event_request_id, start_time, end_time } = req.body;
    
    if (!event_request_id || !start_time || !end_time) {
      return res.status(400).json({ 
        error: 'event_request_id, start_time y end_time son requeridos' 
      });
    }

    // Validar que el EventRequest existe y está confirmado
    const eventRequest = await prisma.eventRequest.findUnique({
      where: { id: event_request_id },
      include: {
        publicSpace: true,
        group: true
      }
    });

    if (!eventRequest) {
      return res.status(404).json({ error: 'Solicitud de evento no encontrada' });
    }

    if (eventRequest.status !== 'CONFIRMED') {
      return res.status(400).json({ 
        error: 'La solicitud de evento debe estar confirmada' 
      });
    }

    // Validar que la fecha de inicio sea anterior a la de fin
    const start = new Date(start_time);
    const end = new Date(end_time);
    
    if (start >= end) {
      return res.status(400).json({ 
        error: 'La fecha de inicio debe ser anterior a la de fin' 
      });
    }

    // Validar que las fechas sean futuras (opcional, depende de tu lógica)
    if (start <= new Date()) {
      return res.status(400).json({ 
        error: 'El evento debe programarse para el futuro' 
      });
    }

    // Verificar disponibilidad del espacio en ese horario
    const conflictingEvent = await prisma.eventsScheduling.findFirst({
      where: {
        eventRequest: {
          public_space_id: eventRequest.public_space_id
        },
        OR: [
          {
            AND: [
              { start_time: { lte: start } },
              { end_time: { gt: start } }
            ]
          },
          {
            AND: [
              { start_time: { lt: end } },
              { end_time: { gte: end } }
            ]
          },
          {
            AND: [
              { start_time: { gte: start } },
              { end_time: { lte: end } }
            ]
          }
        ]
      }
    });

    if (conflictingEvent) {
      return res.status(409).json({ 
        error: 'El espacio público ya está reservado en ese horario' 
      });
    }

    const created = await prisma.eventsScheduling.create({
      data: { 
        event_request_id,
        start_time: start,
        end_time: end
      },
      include: {
        eventRequest: {
          include: {
            group: {
              include: {
                groupRequest: {
                  select: { name: true }
                }
              }
            },
            publicSpace: true
          }
        }
      }
    });
    
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ 
        error: 'Ya existe un evento para esta solicitud' 
      });
    }
    if (error?.code === 'P2003') {
      return res.status(400).json({ 
        error: 'La solicitud de evento especificada no existe' 
      });
    }
    console.log('ERROR POST /events:', error);
    res.status(500).json({ error: 'No se pudo crear el evento' });
  }
});

// PATCH /events/:id - Actualizar evento (solo horarios)
router.patch('/:id', checkJwt, async (req, res) => {
  try {
    // Verificar que el usuario es admin
    const requestingUser = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub } 
    });

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Requiere permisos de administrador' });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar que el evento existe
    const existingEvent = await prisma.eventsScheduling.findUnique({ 
      where: { id },
      include: {
        eventRequest: {
          include: { publicSpace: true }
        }
      }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    
    // Validar fechas si se están actualizando
    const { start_time, end_time } = req.body;
    
    if (start_time || end_time) {
      const start = start_time ? new Date(start_time) : existingEvent.start_time;
      const end = end_time ? new Date(end_time) : existingEvent.end_time;
      
      if (start >= end) {
        return res.status(400).json({ 
          error: 'La fecha de inicio debe ser anterior a la de fin' 
        });
      }

      // Verificar conflictos con otros eventos (excepto el actual)
      if (start_time || end_time) {
        const conflictingEvent = await prisma.eventsScheduling.findFirst({
          where: {
            id: { not: id },
            eventRequest: {
              public_space_id: existingEvent.eventRequest.public_space_id
            },
            OR: [
              {
                AND: [
                  { start_time: { lte: start } },
                  { end_time: { gt: start } }
                ]
              },
              {
                AND: [
                  { start_time: { lt: end } },
                  { end_time: { gte: end } }
                ]
              },
              {
                AND: [
                  { start_time: { gte: start } },
                  { end_time: { lte: end } }
                ]
              }
            ]
          }
        });

        if (conflictingEvent) {
          return res.status(409).json({ 
            error: 'El espacio público ya está reservado en ese horario' 
          });
        }
      }
    }

    // Solo permitir actualizar start_time y end_time
    const allowedFields = ['start_time', 'end_time'];
    const dataToUpdate = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        dataToUpdate[field] = new Date(req.body[field]);
      }
    });

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    const updated = await prisma.eventsScheduling.update({ 
      where: { id }, 
      data: dataToUpdate,
      include: {
        eventRequest: {
          include: {
            group: {
              include: {
                groupRequest: {
                  select: { name: true }
                }
              }
            },
            publicSpace: true
          }
        }
      }
    });
    
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    console.log('ERROR PATCH /events/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el evento' });
  }
});

// DELETE /events/:id - Eliminar evento (solo admin)
router.delete('/:id', checkJwt, async (req, res) => {
  try {
    // Verificar que el usuario es admin
    const requestingUser = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub } 
    });

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Requiere permisos de administrador' });
    }

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Verificar si hay asistencias registradas
    const attendanceCount = await prisma.attendance.count({
      where: { event_id: id }
    });

    if (attendanceCount > 0) {
      return res.status(409).json({ 
        error: `No se puede eliminar: el evento tiene ${attendanceCount} asistencias registradas` 
      });
    }
    
    await prisma.eventsScheduling.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    if (error?.code === 'P2003') {
      return res.status(409).json({ 
        error: 'No se puede eliminar: evento tiene registros asociados' 
      });
    }
    console.log('ERROR DELETE /events/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el evento' });
  }
});

// POST /events/:id/attendance - Registrar asistencia a un evento
router.post('/:id/attendance', checkJwt, async (req, res) => {
  try {
    const event_id = Number(req.params.id);
    if (!Number.isInteger(event_id) || event_id <= 0) {
      return res.status(400).json({ error: 'ID de evento inválido' });
    }

    // Obtener usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el evento existe
    const event = await prisma.eventsScheduling.findUnique({
      where: { id: event_id },
      include: {
        eventRequest: true
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // Verificar que el evento ya ocurrió o está ocurriendo
    if (new Date() < event.start_time) {
      return res.status(400).json({ 
        error: 'No se puede registrar asistencia antes del inicio del evento' 
      });
    }

    // Verificar si ya existe registro de asistencia
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        student_id_event_id: {
          student_id: user.id,
          event_id: event_id
        }
      }
    });

    if (existingAttendance) {
      return res.status(409).json({ 
        error: 'Ya existe un registro de asistencia para este evento' 
      });
    }

    // Determinar status según el momento de registro
    let status = 'PRESENT';
    const now = new Date();
    const fifteenMinutesAfterStart = new Date(event.start_time.getTime() + 15 * 60000);

    if (now > fifteenMinutesAfterStart && now < event.end_time) {
      status = 'LATE';
    }

    const attendance = await prisma.attendance.create({
      data: {
        event_id,
        student_id: user.id,
        status
      },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.log('ERROR POST /events/:id/attendance:', error);
    res.status(500).json({ error: 'No se pudo registrar la asistencia' });
  }
});

module.exports = router;