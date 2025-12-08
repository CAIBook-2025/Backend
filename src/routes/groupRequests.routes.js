const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const { checkJwt, checkAdmin } = require('../middleware/auth');
const groupRequestDeleter = require('../services/groupRequestServices/groupRequestDeleter');
const errorHandler = require('../utils/errorHandler');

const router = Router();

// Constantes
const VALID_REQUEST_STATUS = ['PENDING', 'CONFIRMED', 'CANCELLED'];

// GET /group-requests - Listar solicitudes de grupos
router.get('/', checkJwt, async (req, res) => {
  try {
    // Filtros opcionales
    const { status, user_id } = req.query;

    const where = {};

    if (status) {
      if (!VALID_REQUEST_STATUS.includes(status)) {
        return res.status(400).json({ 
          error: `Status inválido. Debe ser: ${VALID_REQUEST_STATUS.join(', ')}` 
        });
      }
      where.status = status;
    }

    if (user_id) {
      where.user_id = Number(user_id);
    }

    const items = await prisma.groupRequest.findMany({ 
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true
          }
        },
        group: {
          select: {
            id: true,
            reputation: true,
            repre_id: true
          }
        }
      }
    });

    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      goal: item.goal,
      description: item.description,
      logo: item.logo,
      status: item.status,
      is_deleted: item.is_deleted,
      user: item.user,
      group_created: item.group ? true : false,
      group_id: item.group?.id || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt
    }));

    res.json(formattedItems);
  } catch (error) {
    console.log('ERROR GET /group-requests:', error);
    res.status(500).json({ error: 'No se pudo listar las solicitudes de grupos' });
  }
});

// GET /group-requests/:id - Obtener solicitud específica
router.get('/:id', checkJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const item = await prisma.groupRequest.findUnique({ 
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
            career: true,
            student_number: true
          }
        },
        group: {
          include: {
            eventRequests: {
              select: {
                id: true,
                name: true,
                status: true,
                day: true
              },
              take: 5,
              orderBy: { day: 'desc' }
            }
          }
        }
      }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Solicitud de grupo no encontrada' });
    }

    const formatted = {
      id: item.id,
      name: item.name,
      goal: item.goal,
      description: item.description,
      logo: item.logo,
      status: item.status,
      is_deleted: item.is_deleted,
      user: item.user,
      group: item.group ? {
        id: item.group.id,
        reputation: item.group.reputation,
        repre_id: item.group.repre_id,
        recent_events: item.group.eventRequests
      } : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt
    };

    res.json(formatted);
  } catch (error) {
    console.log('ERROR GET /group-requests/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener la solicitud de grupo' });
  }
});

// POST /group-requests - Crear solicitud de grupo
router.post('/', checkJwt, async (req, res) => {
  try {

    const { name, goal, description, logo } = req.body;
    
    // Validación de campos requeridos
    if (!name || !goal) {
      return res.status(400).json({ 
        error: 'name y goal son requeridos' 
      });
    }

    // Validar longitud del nombre
    if (name.length < 3) {
      return res.status(400).json({ 
        error: 'El nombre debe tener al menos 3 caracteres' 
      });
    }

    if (name.length > 100) {
      return res.status(400).json({ 
        error: 'El nombre no puede tener más de 100 caracteres' 
      });
    }

    // Validar longitud del objetivo
    if (goal.length < 10) {
      return res.status(400).json({ 
        error: 'El objetivo debe tener al menos 10 caracteres' 
      });
    }

    // Obtener usuario autenticado
    
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    if (!user) {
      console.error('Usuario no encontrado con auth0_id:', req.auth.sub);
      return res.status(404).json({ 
        error: 'Usuario no encontrado',
        details: {
          auth0_id: req.auth.sub,
          auth: req.auth
        }
      });
    }

    // Verificar que el usuario no tenga otra solicitud pendiente
    const existingPendingRequest = await prisma.groupRequest.findFirst({
      where: {
        user_id: user.id,
        status: 'PENDING'
      }
    });

    if (existingPendingRequest?.length == 3) {
      return res.status(409).json({ 
        error: 'Ya tienes tres solicitudes de grupo pendientes' 
      });
    }

    // Verificar que no exista un grupo con el mismo nombre
    const existingGroupRequest = await prisma.groupRequest.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });

    if (existingGroupRequest) {
      return res.status(409).json({ 
        error: 'Ya existe una solicitud de grupo con ese nombre' 
      });
    }

    const created = await prisma.groupRequest.create({
      data: { 
        name,
        goal,
        description: description || null,
        logo: logo || null,
        user_id: user.id,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });
    
    res.status(201).json(created);

  } catch (error) {
    console.log('ERROR POST /group-requests:', error);
    res.status(500).json({ error: 'No se pudo crear la solicitud de grupo' });
  }
});

// PATCH /group-requests/:id - Actualizar solicitud
router.patch('/:id', checkJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Obtener la solicitud existente
    const existingRequest = await prisma.groupRequest.findUnique({
      where: { id }
    });

    if (!existingRequest) {
      return res.status(404).json({ error: 'Solicitud de grupo no encontrada' });
    }

    // Obtener usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    const isOwner = user.id === existingRequest.user_id;
    const isAdmin = user.role === 'ADMIN';

    const { status } = req.body;

    // Solo admin puede cambiar el status
    if (status && status !== 'PENDING') {
      if (!isAdmin) {
        return res.status(403).json({ 
          error: 'Solo administradores pueden confirmar o cancelar solicitudes' 
        });
      }

      // Validar status
      if (!VALID_REQUEST_STATUS.includes(status)) {
        return res.status(400).json({ 
          error: `Status inválido. Debe ser: ${VALID_REQUEST_STATUS.join(', ')}` 
        });
      }

      // Si se confirma, crear el grupo automáticamente
      if (status === 'CONFIRMED' && existingRequest.status !== 'CONFIRMED') {
        // Verificar que el usuario solicitante sea representante
        const requestingUser = await prisma.user.findUnique({
          where: { id: existingRequest.user_id }
        });

        if (!requestingUser) {
          return res.status(400).json({ 
            error: 'Usuario no autenticado' 
          });
        }

        // Transacción para actualizar solicitud y crear grupo
        const result = await prisma.$transaction(async (tx) => {
          // Actualizar solicitud
          const updatedRequest = await tx.groupRequest.update({
            where: { id },
            data: { status: 'CONFIRMED' },
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true
                }
              }
            }
          });

          // Crear el grupo
          await tx.group.create({
            data: {
              repre_id: existingRequest.user_id,
              group_request_id: id,
              // moderators_ids: [],
              reputation: 0.0
            }
          });

          return updatedRequest;
        });

        return res.json(result);
      }

      // Para cancelar
      const updated = await prisma.groupRequest.update({
        where: { id },
        data: { status },
        include: {
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true
            }
          }
        }
      });

      return res.json(updated);
    }

    // Solo el dueño puede editar otros campos (y solo si está PENDING)
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (existingRequest.status !== 'PENDING') {
      return res.status(400).json({ 
        error: 'Solo se pueden editar solicitudes pendientes' 
      });
    }

    // Whitelist de campos editables
    const allowedFields = ['name', 'goal', 'description', 'logo'];
    const dataToUpdate = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Validaciones específicas
        if (field === 'name') {
          if (req.body[field].length < 3 || req.body[field].length > 100) {
            throw new Error('El nombre debe tener entre 3 y 100 caracteres');
          }
        }
        if (field === 'goal') {
          if (req.body[field].length < 10) {
            throw new Error('El objetivo debe tener al menos 10 caracteres');
          }
        }
        dataToUpdate[field] = req.body[field];
      }
    });

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const updated = await prisma.groupRequest.update({
      where: { id },
      data: dataToUpdate,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Solicitud de grupo no encontrada' });
    }
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }
    console.log('ERROR PATCH /group-requests/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar la solicitud de grupo' });
  }
});

// PATCH /group-requests/delete/:id - Soft Delete own Group Requests
router.patch('/delete/:id', checkJwt, async (req, res) => {
  try {
    const group_request_id = Number(req.params.id);
    const student_auth0_id = req.auth.sub;
    const result = await groupRequestDeleter.softDeleteGroupRequestById(group_request_id, student_auth0_id);
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'PATCH /group-requests/delete/:id', 'No se pudo eliminar la solicitud de grupo');
  }
});

// PATCH /group-requests/admin/delete/:id - Soft Delete por admin
router.patch('/admin/delete/:id', checkJwt, checkAdmin, async (req, res) => {
  try {
    const result = await groupRequestDeleter.adminSoftDeleteGroupRequestById(Number(req.params.id));
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'PATCH /group-requests/admin/delete/:id', 'No se pudo eliminar la solicitud de grupo');
  }
});

// DELETE /group-requests/:id - Eliminar solicitud
router.delete('/:id', checkJwt, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    // Obtener la solicitud
    const groupRequest = await prisma.groupRequest.findUnique({
      where: { id },
      include: { group: true }
    });

    if (!groupRequest) {
      return res.status(404).json({ error: 'Solicitud de grupo no encontrada' });
    }

    // Obtener usuario autenticado
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub }
    });

    const isOwner = user.id === groupRequest.user_id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // No permitir eliminar si está confirmada y tiene grupo creado (solo admin puede)
    if (groupRequest.status === 'CONFIRMED' && groupRequest.group && !isAdmin) {
      return res.status(403).json({ 
        error: 'No se puede eliminar una solicitud confirmada con grupo creado. Solo administradores pueden hacerlo.' 
      });
    }

    // Si tiene grupo creado, eliminarlo también
    if (groupRequest.group) {
      // Verificar que el grupo no tenga eventos
      const eventCount = await prisma.eventRequest.count({
        where: { group_id: groupRequest.group.id }
      });

      if (eventCount > 0) {
        return res.status(409).json({ 
          error: `No se puede eliminar: el grupo tiene ${eventCount} eventos asociados` 
        });
      }

      // Eliminar grupo primero
      await prisma.group.delete({ where: { id: groupRequest.group.id } });
    }
    
    await prisma.groupRequest.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Solicitud de grupo no encontrada' });
    }
    if (error?.code === 'P2003') {
      return res.status(409).json({ 
        error: 'No se puede eliminar: solicitud tiene registros asociados' 
      });
    }
    console.log('ERROR DELETE /group-requests/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar la solicitud de grupo' });
  }
});

module.exports = router;