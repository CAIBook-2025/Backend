const { Router } = require('express');
const { prisma } = require('../lib/prisma');

const router = Router();

// GET /strikes
router.get('/', async (_req, res) => {
  try {
    const strikes = await prisma.strike.findMany({ 
      orderBy: { date: 'desc' },
      include: {
        student: true,  
        admin: true    
      }
    });

    res.json(strikes);
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
    const { student_email, description, date, type, admin_email } = req.body || {};
    

    if (!student_email || !type || !admin_email) {
      return res.status(400).json({ error: 'student_email, type, admin_email son requeridos' });
    }

    const student = await prisma.user.findUnique({
      where: { 
        email: student_email,
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    const admin = await prisma.user.findUnique({
      where: { 
        email: admin_email,
        OR: [
          { role: 'ADMIN' }
        ]
      }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin no encontrado' });
    }

    const created = await prisma.strike.create({
      data: {
        student_id: student.id, 
        type, 
        admin_id: admin.id,
        description: description ?? null,
        date: date ? new Date(date) : undefined
      },
      include: {
        student: true,
        admin: true
      }
    });

    res.status(201).json(created);
  } catch (error) {
    console.log('ERROR POST /strikes:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un strike similar' });
    }
    
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
