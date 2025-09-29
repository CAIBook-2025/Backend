const { Router } = require('express');
const { prisma } = require('../lib/prisma');

const router = Router();

// GET /study-rooms
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.take) || 50, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.studyRoom.findMany({ limit, offset, orderBy: { id: 'asc' } }),
      prisma.studyRoom.count()
    ]);

    res.json({ page, limit, total, items });
  } catch (error) {
    console.log('ERROR GET /study-rooms:', error);
    res.status(500).json({ error: 'No se pudo listar salas' });
  }
});

// GET /study-rooms/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    const room = await prisma.studyRoom.findUnique({ where: { id } });
    if (!room) return res.status(404).json({ error: 'Sala no encontrada' });

    res.json(room);
  } catch (error) {
    console.log('ERROR GET /study-rooms/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener la sala' });
  }
});

// POST /study-rooms
router.post('/', async (req, res) => {
  try {
    const { name, capacity, availability } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name es requerido' });

    const created = await prisma.studyRoom.create({
      data: { name, capacity: capacity ?? null, availability }
    });
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Nombre de sala ya existente' });
    console.log('ERROR POST /study-rooms:', error);
    res.status(500).json({ error: 'No se pudo crear la sala' });
  }
});

// PATCH /study-rooms/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    const updated = await prisma.studyRoom.update({ where: { id }, data: req.body || {} });
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Sala no encontrada' });
    console.log('ERROR PATCH /study-rooms/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar la sala' });
  }
});

// DELETE /study-rooms/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    await prisma.studyRoom.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Sala no encontrada' });
    console.log('ERROR DELETE /study-rooms/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar la sala' });
  }
});

module.exports = router;
