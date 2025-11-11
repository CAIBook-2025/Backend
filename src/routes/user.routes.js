const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const { checkJwt, checkAdmin } = require('../middleware/auth');
// const usersService = require('../users/usersService');
const userCreator = require('../users/userCreator');
const userFetcher = require('../users/userFetcher');
const userUpdater = require('../users/userUpdater');
const userDeleter = require('../users/userDeleter');

const router = Router();

// GET /users
router.get('/', checkJwt, checkAdmin, async (req, res) => {
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

// POST /users
router.post('/', checkJwt, async (req, res) => {
  try {
    const result = await userCreator.createUserInOwnDB(req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.log('ERROR POST /users:', error);
    res.status(500).json({ error: 'No se pudo crear el usuario' });
  }
});

// GET /users/profile
router.get('/profile', checkJwt, async (req, res) => {
  try {
    const result = await userFetcher.getUserProfile(req.auth.sub);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.log('ERROR GET /users/profile:', error);
    res.status(500).json({ error: 'No se pudo obtener el perfil del usuario' });
  }
});

// GET /users/check - debe ir antes de GET /users/:id porque si no lo pilla como id = 'check'
router.get('/check', checkJwt, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { auth0_id: req.auth.sub } });
    console.log(user);
    if (user) {
      console.log(user);
      res.json({ exists: true, user });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.log('ERROR GET /users/check:', error);
    res.status(500).json({ error: 'No se pudo verificar el usuario' });
  }
});

// GET /users/:id
router.get('/:id', checkJwt, async (req, res) => {
  try {
    const result = await userFetcher.getUserById(Number(req.params.id));
    res.status(result.status).json(result.body);
  } catch (error) {
    console.log('ERROR GET /users/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el usuario' });
  }
});

// PATCH /users/profile
router.patch('/profile', checkJwt, async (req, res) => {
  try {
    const result = await userUpdater.updateUser(req.auth.sub, req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.log('ERROR PATCH /users/:id:', error);
    res.status(500).json({ error: 'No se pudo actualizar el usuario' });
  }
});

// DELETE /users/:id - Fully delete: borra realmente el usuario de la db para limpiarla
router.delete('/:id', checkJwt, checkAdmin, async (req, res) => {
  try {
    const result = await userDeleter.deleteUserById(Number(req.params.id));
    res.status(result.status).json(result.body);
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' });
    console.log('ERROR DELETE /users/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el usuario' });
  }
});

// PATCH /users/admin/delete/:id - Soft delete: marca el usuario como eliminado
router.patch('/admin/delete/:id', checkJwt, checkAdmin, async (req, res) => {
  try {
    const result = await userDeleter.softDeleteUserById(Number(req.params.id));
    res.status(result.status).json(result.body);
  } catch (error) {
    console.log('ERROR PATCH /users/admin/delete/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el usuario' });
  }
});

// PATCH /users/admin/restore/:id
router.patch('/admin/restore/:id', checkJwt, checkAdmin, async (req, res) => {
  try {
    const result = await userDeleter.restoreSoftDeletedUserById(Number(req.params.id));
    res.status(result.status).json(result.body);
  } catch (error) {
    console.log('ERROR PATCH /users/admin/restore/:id:', error);
    res.status(500).json({ error: 'No se pudo restaurar el usuario' });
  }
});

// PATCH /users/delete/me 
router.patch('/delete/me', checkJwt, async (req, res) => {
  try {
    const result = await userDeleter.softDeleteOwnUser(req.auth.sub);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.log('ERROR PATCH /users/delete/me:', error);
    res.status(500).json({ error: 'No se pudo eliminar el usuario' });
  }
});

// GET /users/admin/:id
router.get('/admin/:id', checkJwt, checkAdmin, async (req, res) => {
  try {
    const result = await userFetcher.getUserByIdBeingAdmin(Number(req.params.id), req.auth.sub);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.log('ERROR GET /users/admin/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el usuario administrador' });
  }
});

// POST /users/admin/create
router.post('/admin/create', checkJwt, async (req, res) => {
  try {
    const adminUser = await userCreator.createAdminUser(req.body);
    res.status(201).json(adminUser);
  } catch (error) {
    console.log('ERROR POST /users/admin-creation:', error);
    res.status(500).json({ error: 'No se pudo crear el usuario administrador' });
  }
});

// PATCH /users/admin/promote
router.patch('/admin/promote', checkJwt, checkAdmin, async (req, res) => {
  try {
    const user_id = req.body.user_id;
    const result = await userUpdater.promoteUserToAdmin(user_id);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.log('ERROR PATCH /users/admin/promote:', error);
    res.status(500).json({ error: 'No se pudo promover al usuario' });
  }
});

module.exports = router;