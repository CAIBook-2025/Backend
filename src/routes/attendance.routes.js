const { Router } = require('express');
const { prisma } = require('../lib/prisma');

const router = Router();

// GET /attendance
router.get('/', async (_req, res) => {
  try {
    const items = await prisma.attendance.findMany({ orderBy: { id: 'asc' } });
    res.json(items);
  } catch (error) {
    console.log('ERROR GET /attendance:', error);
    res.status(500).json({ error: 'No se pudo listar la asistencia' });
  }
});

// GET /attendance/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    const item = await prisma.attendance.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Registro no encontrado' });

    res.json(item);
  } catch (error) {
    console.log('ERROR GET /attendance/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el registro' });
  }
});

// POST /attendance
router.post('/', async (req, res) => {
  try {
    const { student_id, event_id, rating, feedback } = req.body || {};
    if (!student_id || !event_id) {
      return res.status(400).json({ error: 'student_id y event_id son requeridos' });
    }

    const created = await prisma.attendance.create({
      data: { student_id, event_id, rating: rating ?? null, feedback: feedback ?? null }
    });
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe asistencia para este estudiante y evento' });
    }
    console.log('ERROR POST /attendance:', error);
    res.status(500).json({ error: 'No se pudo crear la asistencia' });
  }
});

// PATCH /attendance/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    const updated = await prisma.attendance.update({ where: { id }, data: req.body || {} });
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
    console.log('ERROR PATCH /attendance/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar la asistencia' });
  }
});

// DELETE /attendance/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    await prisma.attendance.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
    console.log('ERROR DELETE /attendance/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar la asistencia' });
  }
});

module.exports = router;
