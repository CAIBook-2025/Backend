const { Router } = require('express');
const { prisma } = require('../lib/prisma');
const { checkJwt, checkAdmin } = require('../middleware/auth');
const usersService = require('../users/usersService');

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

// GET /users/:id
router.get('/:id', checkJwt, async (req, res) => {
  try {
    const result = await usersService.getUserById(Number(req.params.id));
    res.status(result.status).json(result.body);
  } catch (error) {
    console.log('ERROR GET /users/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el usuario' });
  }
});

// GET /users/check
router.get('/check', checkJwt, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { auth0_id: req.auth.sub } });
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

// POST /users
router.post('/', checkJwt, async (req, res) => {
  try {
    const user = await usersService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.log('ERROR POST /users:', error);
    res.status(500).json({ error: 'No se pudo crear el usuario' });
  }
});

// GET /users/profile
router.get('/profile', checkJwt, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { auth0_id: req.auth.sub },
      select: { id: true, first_name: true, last_name: true, email: true }
    });

    const now = new Date();

    const [schedules, strikes, attendances] = await Promise.all([
      // Reservas de salas del usuario (SRScheduling) + sala
      prisma.sRScheduling.findMany({
        where: { user_id: user.id }, // "activas" = desde hoy
        include: { studyRoom: true },
        orderBy: [{ day: 'asc' }, { module: 'asc' }],
      }),

      // Strikes recibidos por el estudiante
      prisma.strike.findMany({
        where: { student_id: user.id },
        orderBy: { date: 'desc' },
      }),

      // Asistencias del usuario a eventos (+ evento y + solicitud del evento para el nombre)
      prisma.attendance.findMany({
        where: { student_id: user.id },
        include: {
          event: {                    // EventsScheduling
            include: { eventRequest: true }, // para obtener "name", "goal", etc.
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    console.log(schedules);
    console.log(strikes);
    console.log('strikes.length:', strikes.length);

    const upcomingEvents = attendances
      .filter(a => a.event?.start_time && a.event.start_time >= now)
      .map(a => ({
        id: a.event.id,
        title: a.event.eventRequest?.name ?? 'Evento',
        start: a.event.start_time,
        end: a.event.end_time,
        status: 'DISPONIBLE',
      }))
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));

    const reservasActivas = schedules.map(s => ({
      id: s.id,
      roomName: s.studyRoom?.name ?? 'Sala',
      location: s.studyRoom?.location ?? '',
      day: s.day,
      module: s.module,
    }));

    console.log(reservasActivas);

    const completeData = {
      user,
      schedule: reservasActivas,
      scheduleCount: reservasActivas.length,
      strikes,
      strikesCount: strikes.length,
      upcomingEvents,
      upcomingEventsCount: upcomingEvents.length,
      attendances,
      attendancesCount: attendances.length
    };
    res.json(completeData);
  } catch (error) {
    console.log('ERROR GET /users/profile:', error);
    res.status(500).json({ error: 'No se pudo obtener el perfil del usuario' });
  }
});

// PATCH /users/profile
router.patch('/profile', checkJwt, async (req, res) => {
  try {
    const result = await usersService.updateUser(req.auth.sub, req.body);
    res.status(result.status).json(result.body);
  } catch (error) {
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

// POST /users/admin/create
router.post('/admin/create', checkJwt, async (req, res) => {
  try {
    const adminUser = await usersService.createAdminUser(req.body);
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
    const result = await usersService.promoteUserToAdmin(user_id);
    res.status(result.status).json(result.body);
  } catch (error) {
    console.log('ERROR PATCH /users/admin/promote:', error);
    res.status(500).json({ error: 'No se pudo promover al usuario' });
  }
});

module.exports = router;