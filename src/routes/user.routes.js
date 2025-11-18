const { Router } = require('express');
const { checkJwt, checkAdmin } = require('../middleware/auth');
const userCreator = require('../userServices/userCreator');
const userFetcher = require('../userServices/userFetcher');
const userUpdater = require('../userServices/userUpdater');
const userDeleter = require('../userServices/userDeleter');
const userChecker = require('../userServices/userChecker');
const errorHandler = require('../utils/errorHandler');

const router = Router();

// GET /users
router.get('/', checkJwt, checkAdmin, async (req, res) => {
  try {
    const takeQuery = Number(req.query.take);
    const pageQuery = Number(req.query.page);
    const result = await userFetcher.getAllUsers(takeQuery, pageQuery);
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'GET /users', 'No se pudo listar usuarios');
  }
});

// POST /users
router.post('/', checkJwt, async (req, res) => {
  try {
    const result = await userCreator.createUserInOwnDB(req.body);
    res.status(201).json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'POST /users', 'No se pudo crear el usuario');
  }
});

// GET /users/profile
router.get('/profile', checkJwt, async (req, res) => {
  try {
    const result = await userFetcher.getUserProfile(req.auth.sub);
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'GET /users/profile', 'No se pudo obtener el perfil del usuario');
  }
});

// GET /users/check - debe ir antes de GET /users/:id porque si no lo pilla como id = 'check'
router.get('/check', checkJwt, async (req, res) => {
  try {
    const result = await userChecker.userHasBeenCreatedInOwnDB(req.auth.sub);
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'GET /users/check', 'No se pudo verificar el usuario');
  }
});

// GET /users/:id
router.get('/:id', checkJwt, async (req, res) => {
  try {
    const result = await userFetcher.getUserById(Number(req.params.id));
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'GET /users/:id', 'No se pudo obtener el usuario');
  }
});

// PATCH /users/profile
router.patch('/profile', checkJwt, async (req, res) => {
  try {
    const result = await userUpdater.updateUser(req.auth.sub, req.body);
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'PATCH /users/profile', 'No se pudo actualizar el usuario');
  }
});

// DELETE /users/:id - Fully delete: borra realmente el usuario de la db para limpiarla
router.delete('/:id', checkJwt, checkAdmin, async (req, res) => {
  try {
    const result = await userDeleter.deleteUserById(Number(req.params.id));
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'DELETE /users/:id', 'No se pudo eliminar el usuario');
  }
});

// PATCH /users/admin/delete/:id - Soft delete: marca el usuario como eliminado
router.patch('/admin/delete/:id', checkJwt, checkAdmin, async (req, res) => {
  try {
    const result = await userDeleter.softDeleteUserById(Number(req.params.id));
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'PATCH /users/admin/delete/:id', 'No se pudo eliminar el usuario');
  }
});

// PATCH /users/admin/restore/:id
router.patch('/admin/restore/:id', checkJwt, checkAdmin, async (req, res) => {
  try {
    const result = await userDeleter.restoreSoftDeletedUserById(Number(req.params.id));
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'PATCH /users/admin/restore/:id', 'No se pudo restaurar el usuario');
  }
});

// PATCH /users/delete/me 
router.patch('/delete/me', checkJwt, async (req, res) => {
  try {
    const result = await userDeleter.softDeleteOwnUser(req.auth.sub);
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'PATCH /users/delete/me', 'No se pudo eliminar el usuario');
  }
});

// GET /users/admin/:id
router.get('/admin/:id', checkJwt, checkAdmin, async (req, res) => {
  try {
    const result = await userFetcher.getUserByIdBeingAdmin(Number(req.params.id), req.auth.sub);
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'GET /users/admin/:id', 'No se pudo obtener el usuario administrador');
  }
});

// POST /users/admin/create
router.post('/admin/create', checkJwt, async (req, res) => {
  try {
    const adminUser = await userCreator.createAdminUser(req.body);
    res.status(201).json(adminUser);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'POST /users/admin/create', 'No se pudo crear el usuario administrador');
  }
});

// PATCH /users/admin/promote
router.patch('/admin/promote/:id', checkJwt, checkAdmin, async (req, res) => {
  try {
    const user_id = Number(req.params.id);
    const result = await userUpdater.promoteUserToAdmin(user_id);
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'PATCH /users/admin/promote', 'No se pudo promover al usuario');
  }
});

// POST /users/send-change-password-email
router.post('/send-change-password-email', checkJwt, async (req, res) => {
  try {
    const result = await userUpdater.changeUserPassword(req.auth.sub);
    res.json(result);
  } catch (error) {
    errorHandler.handleControllerError(res, error, 'POST /users/send-change-password-email', 'No se pudo cambiar la contraseña del usuario');
  }
});

module.exports = router;