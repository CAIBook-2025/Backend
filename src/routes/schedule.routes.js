const { Router } = require('express');
const { prisma } = require('../lib/prisma');

const router = Router();
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

// GET /schedules?srId=&date=YYYY-MM-DD&page=&take=
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.take) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.srId) where.srId = Number(req.query.srId);
    if (req.query.date) {
      const dayStart = new Date(`${req.query.date}T00:00:00.000Z`);
      const dayEnd   = new Date(`${req.query.date}T23:59:59.999Z`);
      where.startsAt = { lt: dayEnd };
      where.endsAt   = { gt: dayStart };
    }

    const [items, total] = await Promise.all([
      prisma.sRScheduling.findMany({
        where, limit, skip, orderBy: { startsAt: 'asc' },
        include: { user: true, studyRoom: true }
      }),
      prisma.sRScheduling.count({ where })
    ]);

    res.json({ page, limit, total, items });
  } catch (error) {
    console.log('ERROR GET /schedules:', error);
    res.status(500).json({ error: 'No se pudieron listar los horarios' });
  }
});

// GET /schedules/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    const item = await prisma.sRScheduling.findUnique({
      where: { id },
      include: { user: true, studyRoom: true }
    });
    if (!item) return res.status(404).json({ error: 'Horario no encontrado' });

    res.json(item);
  } catch (error) {
    console.log('ERROR GET /schedules/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el horario' });
  }
});

// POST /schedules
router.post('/', async (req, res) => {
  try {
    const { userId, srId, startsAt, endsAt, status } = req.body || {};
    if (!userId || !srId || !startsAt || !endsAt) {
      return res.status(400).json({ error: 'userId, srId, startsAt, endsAt son requeridos' });
    }

    const start = new Date(startsAt);
    const end   = new Date(endsAt);
    if (isNaN(start) || isNaN(end) || start >= end) {
      return res.status(400).json({ error: 'Rango de tiempo inválido' });
    }

    // Chequeo de solape en la misma sala
    const existing = await prisma.sRScheduling.findMany({
      where: {
        srId,
        startsAt: { lt: end },
        endsAt:   { gt: start },
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      select: { id: true, startsAt: true, endsAt: true }
    });
    if (existing.some(r => overlaps(start, end, r.startsAt, r.endsAt))) {
      return res.status(409).json({ error: 'Solape con otro horario en la sala' });
    }

    const created = await prisma.sRScheduling.create({
      data: { userId, srId, startsAt: start, endsAt: end, status: status || 'PENDING' }
    });
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Horario duplicado exacto' });
    console.log('ERROR POST /schedules:', error);
    res.status(500).json({ error: 'No se pudo crear el horario' });
  }
});

// PATCH /schedules/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    const data = { ...req.body };
    if (data.startsAt) data.startsAt = new Date(data.startsAt);
    if (data.endsAt)   data.endsAt   = new Date(data.endsAt);
    if (data.startsAt && data.endsAt && data.startsAt >= data.endsAt) {
      return res.status(400).json({ error: 'Rango de tiempo inválido' });
    }

    const updated = await prisma.sRScheduling.update({ where: { id }, data });
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Horario no encontrado' });
    console.log('ERROR PATCH /schedules/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el horario' });
  }
});

// DELETE /schedules/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    await prisma.sRScheduling.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Horario no encontrado' });
    console.log('ERROR DELETE /schedules/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el horario' });
  }
});

module.exports = router;
