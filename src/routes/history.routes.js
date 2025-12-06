const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const { checkJwt } = require('../middleware/auth');

const router = Router();

// GET /history/study-rooms - Historial de salas de estudio reservadas del alumno autenticado
router.get('/study-rooms', checkJwt, async (req, res) => {
  try {
    // Obtener el usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener paginación
    const take = Math.min(Math.max(Number(req.query.take) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * take;

    // Filtros opcionales
    const where = {
      user_id: user.id
    };

    // Filtro por fecha (desde)
    if (req.query.from) {
      const fromDate = new Date(req.query.from);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({ error: 'Formato de fecha "from" inválido' });
      }
      where.day = { ...where.day, gte: fromDate };
    }

    // Filtro por fecha (hasta)
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({ error: 'Formato de fecha "to" inválido' });
      }
      where.day = { ...where.day, lte: toDate };
    }

    // Filtro por estado
    if (req.query.status) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED'];
      if (!validStatuses.includes(req.query.status)) {
        return res.status(400).json({ 
          error: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}` 
        });
      }
      where.status = req.query.status;
    }

    // Obtener reservas y total
    const [reservations, total] = await Promise.all([
      prisma.sRScheduling.findMany({
        where,
        take,
        skip,
        orderBy: { day: 'desc' },
        include: {
          studyRoom: {
            select: {
              id: true,
              name: true,
              capacity: true,
              location: true,
              equipment: true
            }
          }
        }
      }),
      prisma.sRScheduling.count({ where })
    ]);

    // Formatear respuesta
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      date: reservation.day,
      module: reservation.module,
      status: reservation.status,
      available: reservation.available,
      isFinished: reservation.is_finished,
      studyRoom: reservation.studyRoom,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    }));

    res.json({
      page,
      take,
      total,
      totalPages: Math.ceil(total / take),
      studyRooms: formattedReservations
    });
  } catch (error) {
    console.log('ERROR GET /history/study-rooms:', error);
    res.status(500).json({ error: 'No se pudo obtener el historial de reservas' });
  }
});

// GET /history/events - Historial de eventos asistidos del alumno autenticado
router.get('/events', checkJwt, async (req, res) => {
  try {
    // Obtener el usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener paginación
    const take = Math.min(Math.max(Number(req.query.take) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * take;

    // Filtros opcionales
    const where = {
      student_id: user.id
    };

    // Filtro por estado de asistencia
    if (req.query.status) {
      const validStatuses = ['PENDING', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
      if (!validStatuses.includes(req.query.status)) {
        return res.status(400).json({ 
          error: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}` 
        });
      }
      where.status = req.query.status;
    }

    // Filtro por rating
    if (req.query.minRating) {
      const minRating = Number(req.query.minRating);
      if (isNaN(minRating) || minRating < 0 || minRating > 10) {
        return res.status(400).json({ error: 'Rating mínimo debe estar entre 0 y 10' });
      }
      where.rating = { ...where.rating, gte: minRating };
    }

    if (req.query.maxRating) {
      const maxRating = Number(req.query.maxRating);
      if (isNaN(maxRating) || maxRating < 0 || maxRating > 10) {
        return res.status(400).json({ error: 'Rating máximo debe estar entre 0 y 10' });
      }
      where.rating = { ...where.rating, lte: maxRating };
    }

    // Obtener eventos y total
    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            include: {
              eventRequest: {
                include: {
                  group: {
                    include: {
                      groupRequest: {
                        select: {
                          name: true,
                          logo: true,
                          description: true
                        }
                      }
                    }
                  },
                  publicSpace: {
                    select: {
                      id: true,
                      name: true,
                      location: true,
                      capacity: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.attendance.count({ where })
    ]);

    // Formatear respuesta
    const formattedEvents = attendances.map(attendance => ({
      attendanceId: attendance.id,
      status: attendance.status,
      rating: attendance.rating,
      feedback: attendance.feedback,
      attendedAt: attendance.createdAt,
      event: {
        id: attendance.event.id,
        startTime: attendance.event.start_time,
        endTime: attendance.event.end_time,
        name: attendance.event.eventRequest.name,
        goal: attendance.event.eventRequest.goal,
        description: attendance.event.eventRequest.description,
        group: {
          id: attendance.event.eventRequest.group.id,
          name: attendance.event.eventRequest.group.groupRequest.name,
          logo: attendance.event.eventRequest.group.groupRequest.logo,
          description: attendance.event.eventRequest.group.groupRequest.description,
          reputation: attendance.event.eventRequest.group.reputation
        },
        publicSpace: attendance.event.eventRequest.publicSpace
      }
    }));

    // Calcular estadísticas
    const stats = {
      totalEvents: total,
      present: attendances.filter(a => a.status === 'PRESENT').length,
      absent: attendances.filter(a => a.status === 'ABSENT').length,
      late: attendances.filter(a => a.status === 'LATE').length,
      pending: attendances.filter(a => a.status === 'PENDING').length,
      excused: attendances.filter(a => a.status === 'EXCUSED').length,
      averageRating: attendances.filter(a => a.rating !== null).length > 0
        ? attendances
          .filter(a => a.rating !== null)
          .reduce((sum, a) => sum + Number(a.rating), 0) / 
          attendances.filter(a => a.rating !== null).length
        : null
    };

    res.json({
      page,
      take,
      total,
      totalPages: Math.ceil(total / take),
      stats,
      events: formattedEvents
    });
  } catch (error) {
    console.log('ERROR GET /history/events:', error);
    res.status(500).json({ error: 'No se pudo obtener el historial de eventos' });
  }
});

// GET /history/public-spaces - Historial de espacios públicos reservados (Solo Admin)
router.get('/public-spaces', checkJwt, async (req, res) => {
  try {
    // Obtener el usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que sea administrador
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Solo los administradores pueden ver el historial de espacios públicos' 
      });
    }

    // Obtener paginación
    const take = Math.min(Math.max(Number(req.query.take) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * take;

    // Filtros opcionales
    const where = {};

    // Filtro por espacio público específico
    if (req.query.publicSpaceId) {
      const publicSpaceId = Number(req.query.publicSpaceId);
      if (isNaN(publicSpaceId)) {
        return res.status(400).json({ error: 'ID de espacio público inválido' });
      }
      where.ps_id = publicSpaceId;
    }

    // Filtro por fecha (desde)
    if (req.query.from) {
      const fromDate = new Date(req.query.from);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({ error: 'Formato de fecha "from" inválido' });
      }
      where.start_time = { ...where.start_time, gte: fromDate };
    }

    // Filtro por fecha (hasta)
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({ error: 'Formato de fecha "to" inválido' });
      }
      where.start_time = { ...where.start_time, lte: toDate };
    }

    // Obtener eventos (las reservas de espacios públicos están en eventos)
    const [events, total] = await Promise.all([
      prisma.eventsScheduling.findMany({
        where,
        take,
        skip,
        orderBy: { start_time: 'desc' },
        include: {
          eventRequest: {
            include: {
              group: {
                include: {
                  groupRequest: {
                    select: {
                      name: true,
                      logo: true,
                      description: true
                    }
                  }
                }
              },
              publicSpace: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                  capacity: true
                }
              }
            }
          }
        }
      }),
      prisma.eventsScheduling.count({ where })
    ]);

    // Formatear respuesta
    const formattedReservations = events.map(event => ({
      id: event.id,
      startTime: event.start_time,
      endTime: event.end_time,
      publicSpace: event.eventRequest.publicSpace,
      event: {
        name: event.eventRequest.name,
        goal: event.eventRequest.goal,
        description: event.eventRequest.description
      },
      group: {
        id: event.eventRequest.group.id,
        name: event.eventRequest.group.groupRequest.name,
        logo: event.eventRequest.group.groupRequest.logo,
        reputation: event.eventRequest.group.reputation
      },
      createdAt: event.createdAt,
      updatedAt: event.updatedAt
    }));

    res.json({
      page,
      take,
      total,
      totalPages: Math.ceil(total / take),
      publicSpaces: formattedReservations
    });
  } catch (error) {
    console.log('ERROR GET /history/public-spaces:', error);
    res.status(500).json({ error: 'No se pudo obtener el historial de espacios públicos' });
  }
});

// GET /history/events-created - Historial de eventos realizados (Solo Admin)
router.get('/events-created', checkJwt, async (req, res) => {
  try {
    // Obtener el usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que sea administrador
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Solo los administradores pueden ver el historial de eventos realizados' 
      });
    }

    // Obtener paginación
    const take = Math.min(Math.max(Number(req.query.take) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * take;

    // Filtros opcionales
    const where = {};

    // Filtro por grupo específico
    if (req.query.groupId) {
      const groupId = Number(req.query.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ error: 'ID de grupo inválido' });
      }
      where.eventRequest = { group_id: groupId };
    }

    // Filtro por fecha (desde)
    if (req.query.from) {
      const fromDate = new Date(req.query.from);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({ error: 'Formato de fecha "from" inválido' });
      }
      where.start_time = { ...where.start_time, gte: fromDate };
    }

    // Filtro por fecha (hasta)
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({ error: 'Formato de fecha "to" inválido' });
      }
      where.start_time = { ...where.start_time, lte: toDate };
    }

    // Obtener eventos con estadísticas de asistencia
    const [events, total] = await Promise.all([
      prisma.eventsScheduling.findMany({
        where,
        take,
        skip,
        orderBy: { start_time: 'desc' },
        include: {
          eventRequest: {
            include: {
              group: {
                include: {
                  groupRequest: {
                    select: {
                      name: true,
                      logo: true,
                      description: true
                    }
                  }
                }
              },
              publicSpace: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                  capacity: true
                }
              }
            }
          },
          attendance: {
            select: {
              id: true,
              status: true,
              rating: true,
              student_id: true
            }
          }
        }
      }),
      prisma.eventsScheduling.count({ where })
    ]);

    // Formatear respuesta con estadísticas
    const formattedEvents = events.map(event => {
      const attendanceStats = {
        total: event.attendance.length,
        present: event.attendance.filter(a => a.status === 'PRESENT').length,
        absent: event.attendance.filter(a => a.status === 'ABSENT').length,
        late: event.attendance.filter(a => a.status === 'LATE').length,
        pending: event.attendance.filter(a => a.status === 'PENDING').length,
        excused: event.attendance.filter(a => a.status === 'EXCUSED').length,
        averageRating: event.attendance.filter(a => a.rating !== null).length > 0
          ? event.attendance
            .filter(a => a.rating !== null)
            .reduce((sum, a) => sum + Number(a.rating), 0) / 
            event.attendance.filter(a => a.rating !== null).length
          : null
      };

      return {
        id: event.id,
        startTime: event.start_time,
        endTime: event.end_time,
        name: event.eventRequest.name,
        goal: event.eventRequest.goal,
        description: event.eventRequest.description,
        group: {
          id: event.eventRequest.group.id,
          name: event.eventRequest.group.groupRequest.name,
          logo: event.eventRequest.group.groupRequest.logo,
          reputation: event.eventRequest.group.reputation
        },
        publicSpace: event.eventRequest.publicSpace,
        attendanceStats,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt
      };
    });

    // Calcular estadísticas generales
    const overallStats = {
      totalEvents: total,
      totalAttendance: events.reduce((sum, e) => sum + e.attendance.length, 0),
      averageAttendanceRate: events.length > 0
        ? events.reduce((sum, e) => {
          const present = e.attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
          return sum + (e.attendance.length > 0 ? (present / e.attendance.length) * 100 : 0);
        }, 0) / events.length
        : 0
    };

    res.json({
      page,
      take,
      total,
      totalPages: Math.ceil(total / take),
      stats: overallStats,
      events: formattedEvents
    });
  } catch (error) {
    console.log('ERROR GET /history/events-created:', error);
    res.status(500).json({ error: 'No se pudo obtener el historial de eventos realizados' });
  }
});

// GET /history/groups-created - Historial de grupos creados (Solo Admin)
router.get('/groups-created', checkJwt, async (req, res) => {
  try {
    // Obtener el usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que sea administrador
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Solo los administradores pueden ver el historial de grupos creados' 
      });
    }

    // Obtener paginación
    const take = Math.min(Math.max(Number(req.query.take) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * take;

    // Filtros opcionales
    const where = {};

    // Filtro por reputación mínima
    if (req.query.minReputation) {
      const minRep = Number(req.query.minReputation);
      if (isNaN(minRep)) {
        return res.status(400).json({ error: 'Reputación mínima inválida' });
      }
      where.reputation = { ...where.reputation, gte: minRep };
    }

    // Filtro por reputación máxima
    if (req.query.maxReputation) {
      const maxRep = Number(req.query.maxReputation);
      if (isNaN(maxRep)) {
        return res.status(400).json({ error: 'Reputación máxima inválida' });
      }
      where.reputation = { ...where.reputation, lte: maxRep };
    }

    // Filtro por representante
    if (req.query.representativeId) {
      const repId = Number(req.query.representativeId);
      if (isNaN(repId)) {
        return res.status(400).json({ error: 'ID de representante inválido' });
      }
      where.repre_id = repId;
    }

    // Obtener grupos con información detallada
    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          groupRequest: {
            select: {
              name: true,
              logo: true,
              description: true,
              goal: true
            }
          },
          eventRequests: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          _count: {
            select: {
              eventRequests: true
            }
          }
        }
      }),
      prisma.group.count({ where })
    ]);

    // Obtener información de los representantes
    const representativeIds = [...new Set(groups.map(g => g.repre_id))];
    const representatives = await prisma.user.findMany({
      where: {
        id: { in: representativeIds }
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true
      }
    });

    const representativesMap = representatives.reduce((acc, rep) => {
      acc[rep.id] = rep;
      return acc;
    }, {});

    // Formatear respuesta
    const formattedGroups = groups.map(group => ({
      id: group.id,
      name: group.groupRequest.name,
      logo: group.groupRequest.logo,
      description: group.groupRequest.description,
      goal: group.groupRequest.goal,
      reputation: group.reputation,
      representative: representativesMap[group.repre_id] || null,
      stats: {
        totalEvents: group._count.eventRequests,
        pendingEvents: group.eventRequests.filter(e => e.status === 'PENDING').length,
        approvedEvents: group.eventRequests.filter(e => e.status === 'CONFIRMED').length
      },
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    }));

    // Calcular estadísticas generales
    const overallStats = {
      totalGroups: total,
      averageReputation: groups.length > 0
        ? groups.reduce((sum, g) => sum + Number(g.reputation || 0), 0) / groups.length
        : 0,
      totalEvents: groups.reduce((sum, g) => sum + g._count.eventRequests, 0)
    };

    res.json({
      page,
      take,
      total,
      totalPages: Math.ceil(total / take),
      stats: overallStats,
      groups: formattedGroups
    });
  } catch (error) {
    console.log('ERROR GET /history/groups-created:', error);
    res.status(500).json({ error: 'No se pudo obtener el historial de grupos creados' });
  }
});

// GET /history/representative/events-created - Historial de eventos creados por el representante
router.get('/representative/events-created', checkJwt, async (req, res) => {
  try {
    // Obtener el usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que sea representante
    if (!user.is_representative) {
      return res.status(403).json({ 
        error: 'Solo los representantes pueden ver el historial de eventos creados' 
      });
    }

    // Obtener el grupo del representante
    const group = await prisma.group.findFirst({
      where: { repre_id: user.id }
    });

    if (!group) {
      return res.status(404).json({ 
        error: 'No se encontró un grupo asociado a este representante' 
      });
    }

    // Obtener paginación
    const take = Math.min(Math.max(Number(req.query.take) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * take;

    // Filtros opcionales
    const where = {
      eventRequest: { group_id: group.id }
    };

    // Filtro por fecha (desde)
    if (req.query.from) {
      const fromDate = new Date(req.query.from);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({ error: 'Formato de fecha "from" inválido' });
      }
      where.start_time = { ...where.start_time, gte: fromDate };
    }

    // Filtro por fecha (hasta)
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({ error: 'Formato de fecha "to" inválido' });
      }
      where.start_time = { ...where.start_time, lte: toDate };
    }

    // Obtener eventos con estadísticas de asistencia y detalles de asistentes
    const [events, total] = await Promise.all([
      prisma.eventsScheduling.findMany({
        where,
        take,
        skip,
        orderBy: { start_time: 'desc' },
        include: {
          eventRequest: {
            include: {
              group: {
                include: {
                  groupRequest: {
                    select: {
                      name: true,
                      logo: true,
                      description: true
                    }
                  }
                }
              },
              publicSpace: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                  capacity: true
                }
              }
            }
          },
          attendance: {
            select: {
              id: true,
              status: true,
              rating: true,
              feedback: true,
              student_id: true,
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
      }),
      prisma.eventsScheduling.count({ where })
    ]);

    // Formatear respuesta con estadísticas y detalles de asistentes
    const formattedEvents = events.map(event => {
      const attendanceStats = {
        total: event.attendance.length,
        present: event.attendance.filter(a => a.status === 'PRESENT').length,
        absent: event.attendance.filter(a => a.status === 'ABSENT').length,
        late: event.attendance.filter(a => a.status === 'LATE').length,
        pending: event.attendance.filter(a => a.status === 'PENDING').length,
        excused: event.attendance.filter(a => a.status === 'EXCUSED').length,
        averageRating: event.attendance.filter(a => a.rating !== null).length > 0
          ? event.attendance
            .filter(a => a.rating !== null)
            .reduce((sum, a) => sum + Number(a.rating), 0) / 
            event.attendance.filter(a => a.rating !== null).length
          : null
      };

      // Formatear lista de asistentes con detalles completos
      const attendees = event.attendance.map(a => ({
        attendanceId: a.id,
        student: a.student,
        status: a.status,
        rating: a.rating,
        feedback: a.feedback
      }));

      return {
        id: event.id,
        startTime: event.start_time,
        endTime: event.end_time,
        name: event.eventRequest.name,
        goal: event.eventRequest.goal,
        description: event.eventRequest.description,
        group: {
          id: event.eventRequest.group.id,
          name: event.eventRequest.group.groupRequest.name,
          logo: event.eventRequest.group.groupRequest.logo,
          reputation: event.eventRequest.group.reputation
        },
        publicSpace: event.eventRequest.publicSpace,
        attendanceStats,
        attendees,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt
      };
    });

    // Calcular estadísticas generales
    const overallStats = {
      totalEvents: total,
      totalAttendance: events.reduce((sum, e) => sum + e.attendance.length, 0),
      averageAttendanceRate: events.length > 0
        ? events.reduce((sum, e) => {
          const present = e.attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
          return sum + (e.attendance.length > 0 ? (present / e.attendance.length) * 100 : 0);
        }, 0) / events.length
        : 0
    };

    res.json({
      page,
      take,
      total,
      totalPages: Math.ceil(total / take),
      stats: overallStats,
      events: formattedEvents
    });
  } catch (error) {
    console.log('ERROR GET /history/representative/events-created:', error);
    res.status(500).json({ error: 'No se pudo obtener el historial de eventos creados' });
  }
});

// GET /history/representative/study-rooms - Historial de salas de estudio reservadas por el representante
router.get('/representative/study-rooms', checkJwt, async (req, res) => {
  try {
    // Obtener el usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que sea representante
    if (!user.is_representative) {
      return res.status(403).json({ 
        error: 'Solo los representantes pueden ver su historial de salas de estudio' 
      });
    }

    // Obtener paginación
    const take = Math.min(Math.max(Number(req.query.take) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * take;

    // Filtros opcionales - solo reservas del representante autenticado
    const where = {
      user_id: user.id
    };

    // Filtro por sala específica
    if (req.query.studyRoomId) {
      const roomId = Number(req.query.studyRoomId);
      if (isNaN(roomId)) {
        return res.status(400).json({ error: 'ID de sala inválido' });
      }
      where.sr_id = roomId;
    }

    // Filtro por fecha (desde)
    if (req.query.from) {
      const fromDate = new Date(req.query.from);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({ error: 'Formato de fecha "from" inválido' });
      }
      where.day = { ...where.day, gte: fromDate };
    }

    // Filtro por fecha (hasta)
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({ error: 'Formato de fecha "to" inválido' });
      }
      where.day = { ...where.day, lte: toDate };
    }

    // Filtro por estado
    if (req.query.status) {
      const validStatuses = ['PENDING', 'PRESENT', 'ABSENT'];
      if (!validStatuses.includes(req.query.status)) {
        return res.status(400).json({ 
          error: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}` 
        });
      }
      where.status = req.query.status;
    }

    // Filtro por disponibilidad
    if (req.query.available) {
      const validAvailability = ['AVAILABLE', 'UNAVAILABLE'];
      if (!validAvailability.includes(req.query.available)) {
        return res.status(400).json({ 
          error: `Disponibilidad inválida. Debe ser uno de: ${validAvailability.join(', ')}` 
        });
      }
      where.available = req.query.available;
    }

    // Filtro por finalizado
    if (req.query.isFinished !== undefined) {
      where.is_finished = req.query.isFinished === 'true';
    }

    // Obtener reservas y total
    const [reservations, total] = await Promise.all([
      prisma.sRScheduling.findMany({
        where,
        take,
        skip,
        orderBy: { day: 'desc' },
        include: {
          studyRoom: {
            select: {
              id: true,
              name: true,
              capacity: true,
              location: true,
              equipment: true
            }
          }
        }
      }),
      prisma.sRScheduling.count({ where })
    ]);

    // Formatear respuesta
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      date: reservation.day,
      module: reservation.module,
      status: reservation.status,
      available: reservation.available,
      isFinished: reservation.is_finished,
      studyRoom: reservation.studyRoom,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    }));

    // Calcular estadísticas
    const stats = {
      total,
      byStatus: {
        pending: reservations.filter(r => r.status === 'PENDING').length,
        present: reservations.filter(r => r.status === 'PRESENT').length,
        absent: reservations.filter(r => r.status === 'ABSENT').length
      },
      byAvailability: {
        available: reservations.filter(r => r.available === 'AVAILABLE').length,
        unavailable: reservations.filter(r => r.available === 'UNAVAILABLE').length
      },
      finished: reservations.filter(r => r.is_finished).length,
      active: reservations.filter(r => !r.is_finished).length
    };

    res.json({
      page,
      take,
      total,
      totalPages: Math.ceil(total / take),
      stats,
      studyRooms: formattedReservations
    });
  } catch (error) {
    console.log('ERROR GET /history/representative/study-rooms:', error);
    res.status(500).json({ error: 'No se pudo obtener el historial de salas de estudio' });
  }
});

module.exports = router;
