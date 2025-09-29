const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const router = Router();

// GET /events
router.get('/', async (_req, res) => {
  try {
    const items = await prisma.eventsScheduling.findMany({ 
      orderBy: { startsAt: 'asc' },
      include: {
        group: {
          select: { id: true, name: true, reputation: true }
        },
        publicSpace: {
          select: { id: true, name: true, capacity: true, availability: true }
        },
        eventRequest: {
          select: { id: true, name: true, goal: true, n_attendees: true, status: true }
        },
        attendance: {
          include: {
            student: {
              select: { id: true, first_name: true, last_name: true, email: true }
            }
          }
        }
      }
    });
    res.json(items);
  } catch (error) {
    console.log('ERROR GET /events:', error);
    res.status(500).json({ error: 'No se pudo listar los eventos' });
  }
});

// GET /events/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    const item = await prisma.eventsScheduling.findUnique({ 
      where: { id },
      include: {
        group: {
          select: { id: true, name: true, reputation: true }
        },
        publicSpace: {
          select: { id: true, name: true, capacity: true, availability: true }
        },
        eventRequest: {
          select: { id: true, name: true, goal: true, description: true, n_attendees: true, status: true }
        },
        attendance: {
          include: {
            student: {
              select: { id: true, first_name: true, last_name: true, email: true }
            }
          }
        }
      }
    });
    
    if (!item) return res.status(404).json({ error: 'Evento no encontrado' });
    res.json(item);
  } catch (error) {
    console.log('ERROR GET /events/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el evento' });
  }
});

// POST /events
router.post('/', async (req, res) => {
  try {
    const { public_space_id, group_id, startsAt, endsAt, title, notes, event_request_id } = req.body || {};
    
    if (!public_space_id || !group_id || !startsAt || !endsAt) {
      return res.status(400).json({ error: 'public_space_id, group_id, startsAt y endsAt son requeridos' });
    }

    // Validar que la fecha de inicio sea anterior a la de fin
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (start >= end) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la de fin' });
    }

    // Validar que las fechas sean futuras
    if (start <= new Date()) {
      return res.status(400).json({ error: 'El evento debe programarse para el futuro' });
    }

    const created = await prisma.eventsScheduling.create({
      data: { 
        public_space_id,
        group_id,
        startsAt: start,
        endsAt: end,
        title: title ?? null,
        notes: notes ?? null,
        event_request_id: event_request_id ?? null
      },
      include: {
        group: {
          select: { id: true, name: true }
        },
        publicSpace: {
          select: { id: true, name: true }
        }
      }
    });
    
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un evento en ese espacio y horario' });
    }
    if (error?.code === 'P2003') {
      return res.status(400).json({ error: 'El grupo o espacio público especificado no existe' });
    }
    console.log('ERROR POST /events:', error);
    res.status(500).json({ error: 'No se pudo crear el evento' });
  }
});

// PATCH /events/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    // Validar fechas si se están actualizando
    const { startsAt, endsAt } = req.body || {};
    if (startsAt && endsAt) {
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      if (start >= end) {
        return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la de fin' });
      }
    }
    
    const updated = await prisma.eventsScheduling.update({ 
      where: { id }, 
      data: req.body || {},
      include: {
        group: {
          select: { id: true, name: true }
        },
        publicSpace: {
          select: { id: true, name: true }
        }
      }
    });
    
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Evento no encontrado' });
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Ya existe un evento en ese espacio y horario' });
    console.log('ERROR PATCH /events/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el evento' });
  }
});

// DELETE /events/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    await prisma.eventsScheduling.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Evento no encontrado' });
    if (error?.code === 'P2003') return res.status(409).json({ error: 'No se puede eliminar: evento tiene asistencias registradas' });
    console.log('ERROR DELETE /events/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el evento' });
  }
});

module.exports = router;