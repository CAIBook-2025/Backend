const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const { checkJwt } = require('../middleware/auth');

const router = Router();

// Constantes
const VALID_AVAILABILITY_STATUS = ['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE'];

// GET /public-spaces - Listar espacios públicos
router.get('/', async (req, res) => {
  try {
    // Filtros opcionales
    const { available, min_capacity } = req.query;

    const where = {};

    // Filtrar por disponibilidad
    if (available) {
      where.available = available;
    }

    // Filtrar por capacidad mínima
    if (min_capacity) {
      where.capacity = {
        gte: Number(min_capacity)
      };
    }

    const items = await prisma.publicSpace.findMany({ 
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { eventRequests: true }
        }
      }
    });

    // Agregar información de disponibilidad actual
    const itemsWithAvailability = items.map(item => ({
      ...item,
      total_events: item._count.eventRequests,
      is_bookable: item.available === 'AVAILABLE'
    }));

    res.json(itemsWithAvailability);
  } catch (error) {
    console.log('ERROR GET /public-spaces:', error);
    res.status(500).json({ error: 'No se pudo listar los espacios públicos' });
  }
});

// GET /public-spaces/:id - Obtener espacio público específico
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const item = await prisma.publicSpace.findUnique({ 
      where: { id },
      include: {
        eventRequests: {
          where: {
            status: 'CONFIRMED'
          },
          select: {
            id: true,
            name: true,
            day: true,
            module: true,
            // n_attendees: true,
            group: {
              select: {
                id: true,
                groupRequest: {
                  select: {
                    name: true,
                    logo: true
                  }
                }
              }
            }
          },
          orderBy: { day: 'desc' },
          take: 10
        },
        _count: {
          select: { eventRequests: true }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Espacio público no encontrado' });
    }

    const formatted = {
      ...item,
      total_events: item._count.eventRequests,
      recent_events: item.eventRequests,
      is_bookable: item.available === 'AVAILABLE'
    };

    res.json(formatted);
  } catch (error) {
    console.log('ERROR GET /public-spaces/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el espacio público' });
  }
});

// GET /public-spaces/:id/availability - Consultar disponibilidad de un espacio
router.get('/:id/availability', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Parámetro date es requerido (formato: YYYY-MM-DD)' });
    }

    // Verificar que el espacio existe
    const publicSpace = await prisma.publicSpace.findUnique({
      where: { id }
    });

    if (!publicSpace) {
      return res.status(404).json({ error: 'Espacio público no encontrado' });
    }

    // Obtener eventos confirmados para ese día
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const eventRequests = await prisma.eventRequest.findMany({
      where: {
        public_space_id: id,
        status: 'CONFIRMED',
        day: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        eventsScheduling: {
          select: {
            id: true,
            start_time: true,
            end_time: true
          }
        },
        group: {
          select: {
            id: true,
            groupRequest: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { module: 'asc' }
    });

    // Crear array de módulos (asumiendo 8 módulos de 8:00 a 20:00)
    const modules = Array.from({ length: 8 }, (_, i) => ({
      module: i + 1,
      time: `${8 + i * 1.5}:00 - ${9.5 + i * 1.5}:00`,
      available: true,
      event: null
    }));

    // Marcar módulos ocupados
    eventRequests.forEach(event => {
      if (event.module >= 1 && event.module <= 8) {
        modules[event.module - 1].available = false;
        modules[event.module - 1].event = {
          id: event.id,
          name: event.name,
          group_name: event.group.groupRequest.name,
          // n_attendees: event.n_attendees
        };
      }
    });

    res.json({
      public_space_id: id,
      public_space_name: publicSpace.name,
      date: date,
      space_status: publicSpace.available,
      is_bookable: publicSpace.available === 'AVAILABLE',
      modules
    });
  } catch (error) {
    console.log('ERROR GET /public-spaces/:id/availability:', error);
    res.status(500).json({ error: 'No se pudo consultar la disponibilidad' });
  }
});

// POST /public-spaces - Crear espacio público (solo admin)
router.post('/', checkJwt, async (req, res) => {
  try {
    // Verificar que el usuario es admin
    const requestingUser = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub } 
    });

    if (!requestingUser || requestingUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Requiere permisos de administrador' });
    }

    const { name, capacity, location, available } = req.body;
    
    // Validación de campos requeridos
    if (!name || !location) {
      return res.status(400).json({ 
        error: 'name y location son requeridos' 
      });
    }

    // Validar capacity
    if (capacity !== undefined) {
      const cap = Number(capacity);
      if (!Number.isInteger(cap) || cap <= 0) {
        return res.status(400).json({ 
          error: 'capacity debe ser un número entero positivo' 
        });
      }
    }

    // Validar available
    if (available && !VALID_AVAILABILITY_STATUS.includes(available)) {
      return res.status(400).json({ 
        error: `available debe ser: ${VALID_AVAILABILITY_STATUS.join(', ')}` 
      });
    }

    const created = await prisma.publicSpace.create({
      data: { 
        name, 
        location,
        capacity: capacity ? Number(capacity) : null,
        available: available || 'AVAILABLE'
      }
    });
    
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ 
        error: 'Ya existe un espacio público con ese nombre' 
      });
    }
    console.log('ERROR POST /public-spaces:', error);
    res.status(500).json({ error: 'No se pudo crear el espacio público' });
  }
});

// PATCH /public-spaces/:id - Actualizar espacio público (solo admin)
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

    // Verificar que el espacio existe
    const existingSpace = await prisma.publicSpace.findUnique({ 
      where: { id } 
    });

    if (!existingSpace) {
      return res.status(404).json({ error: 'Espacio público no encontrado' });
    }

    // Whitelist de campos editables
    const allowedFields = ['name', 'capacity', 'location', 'available'];
    const dataToUpdate = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Validaciones específicas
        if (field === 'capacity') {
          const cap = Number(req.body[field]);
          if (!Number.isInteger(cap) || cap <= 0) {
            return res.status(400).json({ 
              error: 'capacity debe ser un número entero positivo' 
            });
          }
          dataToUpdate[field] = cap;
        } else if (field === 'available') {
          if (!VALID_AVAILABILITY_STATUS.includes(req.body[field])) {
            return res.status(400).json({ 
              error: `available debe ser: ${VALID_AVAILABILITY_STATUS.join(', ')}` 
            });
          }
          dataToUpdate[field] = req.body[field];
        } else {
          dataToUpdate[field] = req.body[field];
        }
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    const updated = await prisma.publicSpace.update({ 
      where: { id }, 
      data: dataToUpdate
    });
    
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Espacio público no encontrado' });
    }
    if (error?.code === 'P2002') {
      return res.status(409).json({ 
        error: 'Ya existe un espacio público con ese nombre' 
      });
    }
    console.log('ERROR PATCH /public-spaces/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el espacio público' });
  }
});

// DELETE /public-spaces/:id - Eliminar espacio público (solo admin)
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

    // Verificar si tiene eventos asociados
    const eventCount = await prisma.eventRequest.count({
      where: { public_space_id: id }
    });

    if (eventCount > 0) {
      return res.status(409).json({ 
        error: `No se puede eliminar: el espacio tiene ${eventCount} eventos asociados` 
      });
    }
    
    await prisma.publicSpace.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Espacio público no encontrado' });
    }
    if (error?.code === 'P2003') {
      return res.status(409).json({ 
        error: 'No se puede eliminar: espacio tiene registros asociados' 
      });
    }
    console.log('ERROR DELETE /public-spaces/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el espacio público' });
  }
});

module.exports = router;