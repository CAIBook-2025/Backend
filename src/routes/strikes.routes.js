const { Router } = require('express');
const { prisma } = require('../lib/prisma');

const router = Router();

// GET /strikes
router.get('/', async (_req, res) => {
  try {
    const items = await prisma.strike.findMany({ orderBy: { date: 'desc' } });
    res.json(items);
  } catch (error) {
    console.log('ERROR GET /strikes:', error);
    res.status(500).json({ error: 'No se pudo listar los strikes' });
  }
});

// GET /strikes/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    const item = await prisma.strike.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Strike no encontrado' });

    res.json(item);
  } catch (error) {
    console.log('ERROR GET /strikes/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el strike' });
  }
});

// POST /strikes
router.post('/', async (req, res) => {
  try {
    const { student_id, reason, admin_id, description, date } = req.body || {};
    if (!student_id || !reason || !admin_id) {
      return res.status(400).json({ error: 'student_id, reason, admin_id son requeridos' });
    }

    const created = await prisma.strike.create({
      data: {
        student_id, reason, admin_id,
        description: description ?? null,
        date: date ? new Date(date) : undefined
      }
    });
    res.status(201).json(created);
  } catch (error) {
    console.log('ERROR POST /strikes:', error);
    res.status(500).json({ error: 'No se pudo crear el strike' });
  }
});

// PATCH /strikes/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);

    const updated = await prisma.strike.update({ where: { id }, data });
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Strike no encontrado' });
    console.log('ERROR PATCH /strikes/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el strike' });
  }
});

// DELETE /strikes/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    await prisma.strike.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Strike no encontrado' });
    console.log('ERROR DELETE /strikes/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el strike' });
  }
});

module.exports = router;
