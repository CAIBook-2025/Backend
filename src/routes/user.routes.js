const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const { checkJwt } = require('../middleware/auth');
const usersService = require('../users/usersService');

const router = Router();

// GET /users
router.get('/', async (req, res) => {
  try {
    const take = Math.min(Math.max(Number(req.query.take) || 20, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * take;

    const [items, total] = await Promise.all([
      prisma.user.findMany({ take, skip, orderBy: { id: 'asc' } }),
      prisma.user.count()
    ]);

    console.log(items);

    res.json({ page, take, total, items });
  } catch (error) {
    console.log('ERROR GET /users:', error);
    res.status(500).json({ error: 'No se pudo listar usuarios' });
  }
});

// GET /users/profile
router.get('/profile', checkJwt, async (req, res) => {
  try {
    const user = await usersService.findOrCreateUser(req.auth);
    res.json(user);
  } catch (error) {
    console.log('ERROR GET /users/profile:', error);
    res.status(500).json({ error: "No se pudo obtener el perfil del usuario" });
  }
});

// GET /users/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json(user);
  } catch (error) {
    console.log('ERROR GET /users/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el usuario' });
  }
});

// POST /users
router.post('/', async (req, res) => {
  try {
    const { email, hashed_password, first_name, last_name, role, is_representative, is_moderator } = req.body || {};
    if (!email || !hashed_password || !first_name || !last_name) {
      return res.status(400).json({ error: 'email, hashed_password, first_name, last_name son requeridos' });
    }

    const created = await prisma.user.create({
      data: {
        email, hashed_password, first_name, last_name,
        role, is_representative: !!is_representative, is_moderator: !!is_moderator
      }
    });
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002' && error?.meta?.target?.includes('email')) {
      return res.status(409).json({ error: 'Email ya existe' });
    }
    console.log('ERROR POST /users:', error);
    res.status(500).json({ error: 'No se pudo crear el usuario' });
  }
});

// PATCH /users/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    const updated = await prisma.user.update({ where: { id }, data: req.body || {} });
    res.json(updated);
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.log('ERROR PATCH /users/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el usuario' });
  }
});

// DELETE /users/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    await prisma.user.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.log('ERROR DELETE /users/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el usuario' });
  }
});

module.exports = router;
