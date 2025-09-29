const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const router = Router();

// GET /event-requests
router.get('/', async (_req, res) => {
  try {
    const items = await prisma.eventRequest.findMany({ 
      orderBy: { createdAt: 'desc' },
      include: {
        group: {
          select: { id: true, name: true, reputation: true, 
            representative: {
              select: { id: true, first_name: true, last_name: true, email: true }
            }
          }
        },
        publicSpace: {
          select: { id: true, name: true, capacity: true, availability: true }
        },
        eventsScheduling: {
          select: { id: true, title: true, startsAt: true, endsAt: true, status: true }
        }
      }
    });
    res.json(items);
  } catch (error) {
    console.log('ERROR GET /event-requests:', error);
    res.status(500).json({ error: 'No se pudo listar las solicitudes de eventos' });
  }
});

// GET /event-requests/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    const item = await prisma.eventRequest.findUnique({ 
      where: { id },
      include: {
        group: {
          include: {
            representative: {
              select: { id: true, first_name: true, last_name: true, email: true }
            },
            moderators: {
              select: { id: true, first_name: true, last_name: true, email: true }
            }
          }
        },
        publicSpace: {
          select: { id: true, name: true, capacity: true, availability: true }
        },
        eventsScheduling: {
          include: {
            attendance: {
              select: { id: true, student_id: true, rating: true }
            }
          }
        }
      }
    });
    
    if (!item) return res.status(404).json({ error: 'Solicitud de evento no encontrada' });
    res.json(item);
  } catch (error) {
    console.log('ERROR GET /event-requests/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener la solicitud de evento' });
  }
});

// POST /event-requests
router.post('/', async (req, res) => {
  try {
    const { group_id, public_space_id, name, goal, description, date, n_attendees } = req.body || {};
    
    if (!group_id || !public_space_id || !name || !goal || !date || !n_attendees) {
      return res.status(400).json({ error: 'group_id, public_space_id, name, goal, date y n_attendees son requeridos' });
    }

    // Validar que n_attendees sea un número positivo
    if (!Number.isInteger(n_attendees) || n_attendees <= 0) {
      return res.status(400).json({ error: 'n_attendees debe ser un número entero positivo' });
    }

    // Validar que la fecha sea futura
    const eventDate = new Date(date);
    if (eventDate <= new Date()) {
      return res.status(400).json({ error: 'La fecha del evento debe ser futura' });
    }

    // Validar que el espacio tenga capacidad suficiente
    const publicSpace = await prisma.publicSpace.findUnique({
      where: { id: public_space_id }
    });

    if (!publicSpace) {
      return res.status(404).json({ error: 'Espacio público no encontrado' });
    }

    if (publicSpace.capacity && n_attendees > publicSpace.capacity) {
      return res.status(400).json({ error: `El espacio tiene capacidad para ${publicSpace.capacity} personas, pero solicitas ${n_attendees}` });
    }

    if (publicSpace.availability !== 'AVAILABLE') {
      return res.status(400).json({ error: 'El espacio público no está disponible' });
    }

    const created = await prisma.eventRequest.create({
      data: { 
        group_id,
        public_space_id,
        name,
        goal,
        description: description ?? null,
        date: eventDate,
        n_attendees
      },
      include: {
        group: {
          select: { id: true, name: true }
        },
        publicSpace: {
          select: { id: true, name: true, capacity: true }
        }
      }
    });
    
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2003') {
      return res.status(400).json({ error: 'El grupo o espacio público especificado no existe' });
    }
    console.log('ERROR POST /event-requests:', error);
    res.status(500).json({ error: 'No se pudo crear la solicitud de evento' });
  }
});

// PATCH /event-requests/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    // Validaciones especiales para ciertos campos
    const { date, n_attendees, status } = req.body || {};
    
    if (date) {
      const eventDate = new Date(date);
      if (eventDate <= new Date()) {
        return res.status(400).json({ error: 'La fecha del evento debe ser futura' });
      }
    }
    
    if (n_attendees && (!Number.isInteger(n_attendees) || n_attendees <= 0)) {
      return res.status(400).json({ error: 'n_attendees debe ser un número entero positivo' });
    }

    // Si se está confirmando la solicitud, crear el evento automáticamente
    if (status === 'CONFIRMED') {
      const eventRequest = await prisma.eventRequest.findUnique({
        where: { id },
        include: { publicSpace: true }
      });
      
      if (!eventRequest) {
        return res.status(404).json({ error: 'Solicitud de evento no encontrada' });
      }
      
      if (eventRequest.status !== 'PENDING') {
        return res.status(400).json({ error: 'Solo se pueden confirmar solicitudes pendientes' });
      }

      // Transacción para actualizar solicitud y crear evento
      const result = await prisma.$transaction(async (tx) => {
        // Actualizar solicitud
        const updatedRequest = await tx.eventRequest.update({
          where: { id },
          data: { status: 'CONFIRMED' },
          include: {
            group: {
              select: { id: true, name: true }
            },
            publicSpace: {
              select: { id: true, name: true }
            }
          }
        });

        // Crear evento automáticamente (con horario por defecto)
        const eventDate = new Date(eventRequest.date);
        const startTime = new Date(eventDate);
        startTime.setHours(10, 0, 0, 0); // 10:00 AM por defecto
        const endTime = new Date(eventDate);
        endTime.setHours(12, 0, 0, 0); // 12:00 PM por defecto

        await tx.eventsScheduling.create({
          data: {
            public_space_id: eventRequest.public_space_id,
            group_id: eventRequest.group_id,
            event_request_id: id,
            startsAt: startTime,
            endsAt: endTime,
            title: eventRequest.name,
            notes: eventRequest.description
          }
        });

        return updatedRequest;
      });

      return res.json(result);
    }

    const updated = await prisma.eventRequest.update({ 
      where: { id }, 
      data: req.body || {},
      include: {
        group: {
          select: { id: true, name: true }
        },
        publicSpace: {
          select: { id: true, name: true, capacity: true }
        }
      }
    });
    
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Solicitud de evento no encontrada' });
    console.log('ERROR PATCH /event-requests/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar la solicitud de evento' });
  }
});

// DELETE /event-requests/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    await prisma.eventRequest.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Solicitud de evento no encontrada' });
    if (error?.code === 'P2003') return res.status(409).json({ error: 'No se puede eliminar: solicitud tiene eventos programados asociados' });
    console.log('ERROR DELETE /event-requests/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar la solicitud de evento' });
  }
});

module.exports = router;