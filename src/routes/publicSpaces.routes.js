const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const router = Router();

// GET /public-spaces
router.get('/', async (_req, res) => {
  try {
    const items = await prisma.publicSpace.findMany({ 
      orderBy: { id: 'asc' }
    });
    res.json(items);
  } catch (error) {
    console.log('ERROR GET /public-spaces:', error);
    res.status(500).json({ error: 'No se pudo listar los espacios públicos' });
  }
});

// GET /public-spaces/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    const item = await prisma.publicSpace.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Espacio público no encontrado' });
    res.json(item);
  } catch (error) {
    console.log('ERROR GET /public-spaces/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el espacio público' });
  }
});

// POST /public-spaces
router.post('/', async (req, res) => {
  try {
    const { name, capacity, availability } = req.body || {};
    
    if (!name) {
      return res.status(400).json({ error: 'name es requerido' });
    }

    const created = await prisma.publicSpace.create({
      data: { 
        name, 
        capacity: capacity ?? null,
        availability: availability ?? 'AVAILABLE'
      }
    });
    
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un espacio público con ese nombre' });
    }
    console.log('ERROR POST /public-spaces:', error);
    res.status(500).json({ error: 'No se pudo crear el espacio público' });
  }
});

// PATCH /public-spaces/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    const updated = await prisma.publicSpace.update({ 
      where: { id }, 
      data: req.body || {}
    });
    
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Espacio público no encontrado' });
    console.log('ERROR PATCH /public-spaces/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el espacio público' });
  }
});

// DELETE /public-spaces/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    await prisma.publicSpace.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Espacio público no encontrado' });
    console.log('ERROR DELETE /public-spaces/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el espacio público' });
  }
});

module.exports = router;
