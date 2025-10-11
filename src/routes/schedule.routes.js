const { Router } = require('express');
const { prisma } = require('../lib/prisma');

const router = Router();
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

// GET /schedules?srId=&date=YYYY-MM-DD&page=&take=
router.get('/', async (req, res) => {
  try {
    const take = Math.min(Math.max(Number(req.query.take) || 30, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * take;

    const where = {};

    const date = new Date(`${String(req.query.day)}T00:00:00.000Z`)
    console.log(date);

    if (req.query.day) {
      const dateStr = String(req.query.day);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return res.status(400).json({ error: 'El formato de date debe ser YYYY-MM-DD' });
      }
      // Igualdad exacta a medianoche UTC
      const dayUTC = new Date(`${dateStr}T00:00:00.000Z`);
      where.day = { equals: dayUTC };
    }

    const [items, total] = await Promise.all([
      prisma.sRScheduling.findMany({
        where,
        take,
        skip,
        orderBy: [{ day: 'asc' }, { module: 'asc' }],
        include: {
          studyRoom: true,
        }
      }),
      prisma.sRScheduling.count({ where })
    ]);

    res.json({ page, take, total, items });
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
    const { userId, srId, day, module, available } = req.body || {};
    if (!userId || !srId || !day || !module ) {
      return res.status(400).json({ error: 'userId, srId, day, module son requeridos' });
    }

    // Chequeo de solape en la misma sala
    const existing = await prisma.sRScheduling.findMany({
      where: {
        sr_id: srId,
        day,
        module
      },
      select: { id: true, module }
    });
    if (existing.some(r => overlaps(start, end, r.startsAt, r.endsAt))) {
      return res.status(409).json({ error: 'Solape con otro horario en la sala' });
    }

    const created = await prisma.sRScheduling.create({
      data: { user_id: userId, sr_id: srId, day, module, available }
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
