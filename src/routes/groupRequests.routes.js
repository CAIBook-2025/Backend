const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const router = Router();

// GET /groups
router.get('/', async (_req, res) => {
  try {
    const items = await prisma.group.findMany({ 
      orderBy: { id: 'asc' },
    });
    res.json(items);
  } catch (error) {
    console.log('ERROR GET /groups:', error);
    res.status(500).json({ error: 'No se pudo listar los grupos' });
  }
});

// GET /groups/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    const item = await prisma.group.findUnique({ 
      where: { id },
      include: {
        representative: {
          select: { id: true, first_name: true, last_name: true, email: true }
        },
        moderators: {
          select: { id: true, first_name: true, last_name: true, email: true }
        },
        groupRequest: true,
        eventRequests: true,
        eventsScheduling: true
      }
    });
    
    if (!item) return res.status(404).json({ error: 'Grupo no encontrado' });
    res.json(item);
  } catch (error) {
    console.log('ERROR GET /groups/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el grupo' });
  }
});

// POST /groups-requests
router.post('/', async (req, res) => {
  try {
    const { user_id, name, goal, description, logo } = req.body || {};
    console.log("está entrando al try????");
    
    // if (!name || !description) {
    //   return res.status(400).json({ error: 'name y description son requeridos' });
    // }

    const data = {
      user_id: user_id, 
      name: name,
      goal: goal,
      description: description,
      logo: logo,
      status: "PENDING"
    }

    const created = await prisma.groupRequest.create({ data });    
    res.status(201).json(created);

  } catch (error) {

    console.log('Hay un error???')
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un grupo con ese nombre' });
    }
    console.log('ERROR POST /groups:', error);
    res.status(500).json({ error: 'No se pudo crear el grupo' });
  }
});

// PATCH /groups/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    const updated = await prisma.group.update({ 
      where: { id }, 
      data: req.body || {},
      include: {
        representative: {
          select: { id: true, first_name: true, last_name: true, email: true }
        }
      }
    });
    
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Grupo no encontrado' });
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Ya existe un grupo con ese nombre' });
    console.log('ERROR PATCH /groups/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el grupo' });
  }
});

// DELETE /groups/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    
    await prisma.group.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Grupo no encontrado' });
    if (error?.code === 'P2003') return res.status(409).json({ error: 'No se puede eliminar: grupo tiene eventos asociados' });
    console.log('ERROR DELETE /groups/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el grupo' });
  }
});

module.exports = router;