const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const { checkJwt } = require('../middleware/auth');

const router = Router();

// Constantes
const VALID_REQUEST_STATUS = ['PENDING', 'CONFIRMED', 'CANCELLED'];

// GET /events - Listar solicitudes de eventos
router.get('/', checkJwt, async (req, res) => {
  try {
    // Filtros opcionales
    const { status, group_id } = req.query;

    const where = {};

    if (status) {
      if (!VALID_REQUEST_STATUS.includes(status)) {
        return res.status(400).json({ 
          error: `Status inválido. Debe ser: ${VALID_REQUEST_STATUS.join(', ')}` 
        });
      }
      where.status = status;
    }

    if (group_id) {
      where.group_id = Number(group_id);
    }

    const items = await prisma.eventRequest.findMany({ 
      where,
      orderBy: { createdAt: 'desc' },
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
        },
      }
    });

    // Formatear respuesta con información del grupo
    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      goal: item.goal,
      description: item.description,
      status: item.status,
      day: item.day,
      module: item.module,
      n_attendees: item.n_attendees,
      group: {
        id: item.group.id,
        name: item.group.groupRequest.name,
        logo: item.group.groupRequest.logo,
        reputation: item.group.reputation
      },
      public_space: item.publicSpace,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    res.json(formattedItems);
  } catch (error) {
    console.log('ERROR GET /event-requests:', error);
    res.status(500).json({ error: 'No se pudo listar las solicitudes de eventos' });
  }
});

// GET /events/:id - Obtener solicitud específica
router.get('/:id', checkJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const item = await prisma.eventRequest.findUnique({ 
      where: { id },
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
        },
      }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Solicitud de evento no encontrada' });
    }

    // Obtener moderadores del grupo
    const moderatorIds = Array.isArray(item.group.moderators_ids) 
      ? item.group.moderators_ids 
      : [];
    
    const moderators = moderatorIds.length > 0 
      ? await prisma.user.findMany({
        where: { id: { in: moderatorIds } },
        select: { 
          id: true, 
          first_name: true, 
          last_name: true, 
          email: true 
        }
      })
      : [];

    // Obtener representante
    const representative = await prisma.user.findUnique({
      where: { id: item.group.repre_id },
      select: { 
        id: true, 
        first_name: true, 
        last_name: true, 
        email: true 
      }
    });

    const formatted = {
      id: item.id,
      name: item.name,
      goal: item.goal,
      description: item.description,
      status: item.status,
      day: item.day,
      module: item.module,
      n_attendees: item.n_attendees,
      group: {
        id: item.group.id,
        name: item.group.groupRequest.name,
        description: item.group.groupRequest.description,
        logo: item.group.groupRequest.logo,
        reputation: item.group.reputation,
        representative,
        moderators,
        creator: item.group.groupRequest.user
      },
      public_space: item.publicSpace,
      events_scheduling: item.eventsScheduling,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };

    res.json(formatted);
  } catch (error) {
    console.log('ERROR GET /event-requests/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener la solicitud de evento' });
  }
});

// POST /events - Crear solicitud de evento
router.post('/', checkJwt, async (req, res) => {
  try {
    const { group_id, public_space_id, name, goal, description, day, module } = req.body;
    
    // Validación de campos requeridos
    if (!group_id || !public_space_id || !name || !goal || !day || module === undefined || !description) {
      return res.status(400).json({ 
        error: 'group_id, public_space_id, name, goal, day y module son requeridos' 
      });
    }

    // Validar module (1-8)
    if (!Number.isInteger(module) || module < 1 || module > 8) {
      return res.status(400).json({ 
        error: 'module debe ser un número entre 1 y 8' 
      });
    }

    // Validar que la fecha sea futura
    const eventDay = new Date(day);
    eventDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDay < today) {
      return res.status(400).json({ 
        error: 'La fecha del evento debe ser hoy o futura' 
      });
    }

    // Obtener usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el grupo existe y el usuario tiene permisos
    const group = await prisma.group.findUnique({
      where: { id: group_id }
    });

    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    // Verificar que el usuario es representante o moderador del grupo
    const moderatorIds = Array.isArray(group.moderators_ids) 
      ? group.moderators_ids 
      : [];
    const isRepresentative = user.id === group.repre_id;
    const isAdmin = user.role === 'ADMIN';

    if (!isRepresentative && !isAdmin) {
      return res.status(403).json({ 
        error: 'Solo el representante o administradores pueden crear solicitudes' 
      });
    }

    // Validar que el espacio existe y está disponible
    const publicSpace = await prisma.publicSpace.findUnique({
      where: { id: public_space_id }
    });

    if (!publicSpace) {
      return res.status(404).json({ error: 'Espacio público no encontrado' });
    }

    if (publicSpace.available !== 'AVAILABLE') {
      return res.status(400).json({ 
        error: `El espacio público no está disponible (estado: ${publicSpace.available})` 
      });
    }

    // Verificar que el usuario no tenga otra solicitud pendiente
    const existingPendingRequest = await prisma.eventRequest.findFirst({
      where: {
        group_id,
        status: 'PENDING'
      }
    });

    if (existingPendingRequest.length == 3) {
      return res.status(409).json({ 
        error: 'Ya tienes tres solicitudes de grupo pendientes' 
      });
    }

    // Verificar que no haya conflictos en ese día y módulo
    const conflictingRequest = await prisma.eventRequest.findFirst({
      where: {
        public_space_id,
        day: eventDay,
        module,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    if (conflictingRequest) {
      return res.status(409).json({ 
        error: `Ya existe una solicitud para ese espacio en el día ${day} módulo ${module}` 
      });
    }

    const created = await prisma.eventRequest.create({
      data: { 
        group_id,
        public_space_id,
        name,
        goal,
        description: description || null,
        day: eventDay,
        module,
        status: 'PENDING'
      },
      include: {
        group: {
          include: {
            groupRequest: {
              select: { name: true, logo: true }
            }
          }
        },
        publicSpace: {
          select: { 
            id: true, 
            name: true, 
            capacity: true,
            location: true 
          }
        }
      }
    });
    
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2003') {
      return res.status(400).json({ 
        error: 'El grupo o espacio público especificado no existe' 
      });
    }
    console.log('ERROR POST /event-requests:', error);
    res.status(500).json({ error: 'No se pudo crear la solicitud de evento' });
  }
});



// DELETE /event-requests/:id - Eliminar solicitud
router.delete('/:id', checkJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Obtener la solicitud
    const eventRequest = await prisma.eventRequest.findUnique({
      where: { id },
      include: { group: true }
    });

    if (!eventRequest) {
      return res.status(404).json({ error: 'Solicitud de evento no encontrada' });
    }

    // Obtener usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    // Verificar permisos
    const moderatorIds = Array.isArray(eventRequest.group.moderators_ids) 
      ? eventRequest.group.moderators_ids 
      : [];
    const isRepresentative = user.id === eventRequest.group.repre_id;
    const isModerator = moderatorIds.includes(user.id);
    const isAdmin = user.role === 'ADMIN';

    if (!isRepresentative && !isModerator && !isAdmin) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // No permitir eliminar si ya está confirmada (solo admin puede)
    if (eventRequest.status === 'CONFIRMED' && !isAdmin) {
      return res.status(403).json({ 
        error: 'No se puede eliminar una solicitud confirmada. Solo administradores pueden hacerlo.' 
      });
    }

    // Verificar si tiene eventos programados
    const schedulingCount = await prisma.eventsScheduling.count({
      where: { event_request_id: id }
    });

    if (schedulingCount > 0 && !isAdmin) {
      return res.status(409).json({ 
        error: 'No se puede eliminar: la solicitud tiene eventos programados' 
      });
    }
    
    await prisma.eventRequest.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Solicitud de evento no encontrada' });
    }
    if (error?.code === 'P2003') {
      return res.status(409).json({ 
        error: 'No se puede eliminar: solicitud tiene registros asociados' 
      });
    }
    console.log('ERROR DELETE /event-requests/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar la solicitud de evento' });
  }
});


// ADMIN CAI
// PATCH /events/:id - Actualizar solicitud (cambiar status principalmente)
router.patch('/:id', checkJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Obtener la solicitud existente
    const existingRequest = await prisma.eventRequest.findUnique({
      where: { id },
      include: {
        group: true,
        publicSpace: true
      }
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Solicitud de evento no encontrada' });
    }

    // Obtener usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    // Verificar permisos
    //const moderatorIds = Array.isArray(existingRequest.group.moderators_ids) 
    //? existingRequest.group.moderators_ids 
    //: [];
    // Desactivamos hasta que se ocupen para errores de lint
    //const isRepresentative = user.id === existingRequest.group.repre_id;
    //const isModerator = moderatorIds.includes(user.id);
    const isAdmin = user.role === 'ADMIN';

    const { status } = req.body;

    // Solo admin puede confirmar o cancelar
    if (status && status !== 'PENDING') {
      if (!isAdmin) {
        return res.status(403).json({ 
          error: 'Solo administradores pueden confirmar o cancelar solicitudes' 
        });
      }
    }

    // Validar status
    if (status && !VALID_REQUEST_STATUS.includes(status)) {
      return res.status(400).json({ 
        error: `Status inválido. Debe ser: ${VALID_REQUEST_STATUS.join(', ')}` 
      });
    }

    // Si se está confirmando, crear el EventsScheduling
    if (status === 'CONFIRMED' && existingRequest.status !== 'CONFIRMED') {
      // Calcular horarios basados en el módulo
      const moduleStartHour = 8 + (existingRequest.module - 1) * 1.5;
      const moduleEndHour = moduleStartHour + 1.5;

      const startTime = new Date(existingRequest.day);
      startTime.setHours(Math.floor(moduleStartHour), (moduleStartHour % 1) * 60, 0, 0);

      const endTime = new Date(existingRequest.day);
      endTime.setHours(Math.floor(moduleEndHour), (moduleEndHour % 1) * 60, 0, 0);

      // Transacción para actualizar y crear evento
      const result = await prisma.$transaction(async (tx) => {
        // Actualizar solicitud
        const updatedRequest = await tx.eventRequest.update({
          where: { id },
          data: { status: 'CONFIRMED' },
          include: {
            group: {
              include: {
                groupRequest: {
                  select: { name: true, logo: true }
                }
              }
            },
            publicSpace: true
          }
        });

        return updatedRequest;
      });

      return res.json(result);
    }

    // Validación de otros campos si se están actualizando
    const allowedFields = isAdmin 
      ? ['name', 'goal', 'description', 'day', 'module', 'n_attendees', 'status']
      : ['name', 'goal', 'description'];

    const dataToUpdate = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Validaciones específicas
        if (field === 'day') {
          const eventDay = new Date(req.body[field]);
          eventDay.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (eventDay < today) {
            throw new Error('La fecha del evento debe ser hoy o futura');
          }
          dataToUpdate[field] = eventDay;
        } else if (field === 'module') {
          const mod = Number(req.body[field]);
          if (!Number.isInteger(mod) || mod < 1 || mod > 8) {
            throw new Error('module debe ser un número entre 1 y 8');
          }
          dataToUpdate[field] = mod;
        } else if (field === 'n_attendees') {
          const n = Number(req.body[field]);
          if (!Number.isInteger(n) || n <= 0) {
            throw new Error('n_attendees debe ser un número entero positivo');
          }
          dataToUpdate[field] = n;
        } else {
          dataToUpdate[field] = req.body[field];
        }
      }
    });

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const updated = await prisma.eventRequest.update({ 
      where: { id }, 
      data: dataToUpdate,
      include: {
        group: {
          include: {
            groupRequest: {
              select: { name: true, logo: true }
            }
          }
        },
        publicSpace: true
      }
    });
    
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Solicitud de evento no encontrada' });
    }
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    console.log('ERROR PATCH /event-requests/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar la solicitud de evento' });
  }
});

module.exports = router;