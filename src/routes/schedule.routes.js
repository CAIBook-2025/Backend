const { Router } = require('express');
const { prisma } = require('../lib/prisma');

const router = Router();
// const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;
// function addDays(date, days) {
//   const d = new Date(date);
//   console.log("previos date", d)
//   d.setDate(d.getDate() + days);
//   console.log("new date", d)
//   return d;
// }

// GET /schedules?srId=&date=YYYY-MM-DD&page=&take=
router.get('/', async (req, res) => {
  try {
    const take = Math.min(Math.max(Number(req.query.take) || 30, 1), 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * take;

    const where = {};

    // const date = new Date(`${String(req.query.day)}T00:00:00.000Z`);

    if (req.query.day) {
      const dateStr = String(req.query.day);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return res.status(400).json({ error: 'El formato de date debe ser YYYY-MM-DD' });
      }
      // Igualdad exacta a medianoche UTC
      const dayUTC = new Date(`${dateStr}T03:00:00.000Z`);
      where.day = { equals: dayUTC };
    }

    const [items, total] = await Promise.all([
      prisma.sRScheduling.findMany({
        where,
        take,
        skip,
        orderBy: [{ day: 'asc' }, { module: 'asc' }],
        include: {
          studyRoom: true,
          user: true
        }
      }),
      prisma.sRScheduling.count({ where })
    ]);

    console.log(total);

    res.json({ page, take, total, items });
  } catch (error) {
    console.log('ERROR GET /schedules:', error);
    res.status(500).json({ error: 'No se pudieron listar los horarios' });
  }
});

// GET /my study-rooms associated to current user
router.get('/my/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      status,
      from,
      to,
      // includePast = 'false',
      page = '1',
      pageSize = '20'
    } = req.query;

    // Construcción del filtro
    const where = { user_id: Number(userId) };
    if (status) where.status = status; // enum RequestStatus

    // Rango de fechas
    const dateFilter = {};
    if (from) dateFilter.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) dateFilter.lte = new Date(`${to}T23:59:59.999Z`);

    // Si no me piden incluir pasadas y no hay 'from', parto desde hoy
    // const includePastBool = String(includePast).toLowerCase() === 'true';
    
    // if (!includePastBool && !from) {
    //   const today = new Date();
    //   console.log("TODAY", today);
    //   today.setHours(0, 0, 0, 0);
    //   console.log("TODAY 2", today)
    //   dateFilter.gte = dateFilter.gte ?? today;
    // }
    // if (Object.keys(dateFilter).length) {
    //   console.log("ENTRA AQUÍ");
    //   where.day = dateFilter;
    // }

    // Paginación
    const take = Math.min(Number(pageSize) || 20, 100);
    const skip = ((Number(page) || 1) - 1) * take;

    const [items, total] = await prisma.$transaction([
      prisma.sRScheduling.findMany({
        where,
        include: {
          studyRoom: true, // nombre, capacidad, location, etc.
        },
        orderBy: [{ day: 'asc' }, { module: 'asc' }],
        skip,
        take,
      }),
      prisma.sRScheduling.count({ where }),
    ]);

    res.json({ total, page: Number(page) || 1, pageSize: take, items });
  } catch (err) {
    console.error('GET /api/schedules/my error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /schedules/:id
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    const item = await prisma.sRScheduling.findUnique({
      where: { id },
      include: { user: true, studyRoom: true }
    });
    if (!item) return res.status(404).json({ error: 'Horario no encontrado' });

    res.json(item);
  } catch (error) {
    console.log('ERROR GET /schedules/:id:', error);
    res.status(500).json({ error: 'No se pudo obtener el horario' });
  }
});

// POST /schedules
router.post('/', async (req, res) => {
  try {
    const { srId, day, module, available } = req.body || {};
    if (!srId || !day || !module) {
      return res.status(400).json({ error: 'srId, day, module son requeridos' });
    }

    // const availability = req.body.available || 'AVAILABLE';

    // Chequeo de horario duplicado en la misma sala
    const existing = await prisma.sRScheduling.findFirst({
      where: {
        sr_id: srId,
        day,
        module
      }
    });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un horario para esta sala, día y módulo' });
    }

    const created = await prisma.sRScheduling.create({
      data: { sr_id: srId, day, module, available }
    });
    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Horario duplicado exacto' });
    console.log('ERROR POST /schedules:', error);
    res.status(500).json({ error: 'No se pudo crear el horario' });
  }
});

// PATCH /schedules/book
router.patch('/book', async (req, res) => {
  try {
    const { userId, id } = req.body || {};

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    console.log(id);
    console.log(userId);

    const schedule = await prisma.sRScheduling.findMany({
      where: { id }
    });

    console.log(schedule);

    const result = await prisma.sRScheduling.updateMany({
      where: {
        id,
        user_id: null,
        available: 'AVAILABLE',
        status: 'PENDING'
      },
      data: {
        user_id: userId,
        available: 'UNAVAILABLE',
      },
    });

    console.log(result);

    if (result.count !== 1) {
      return res.status(409).json({
        error: 'El horario no está disponible o no existe',
      });
    }

    const updated = await prisma.sRScheduling.findUnique({ where: { id } });
    return res.json(updated);

  } catch (error) {
    console.log('ERROR PATCH /schedules/:id/reserve:', error);
    return res.status(500).json({ error: 'No se pudo reservar el horario' });
  }
});

// PATCH /schedules/cancel/:id
router.patch('/cancel', async (req, res) => {
  try {
    const { scheduleId, userId } = req.body || {};

    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const result = await prisma.sRScheduling.updateMany({
      where: {
        id: scheduleId,
        available: 'UNAVAILABLE',
        user_id: userId
      },
      data: {
        user_id: null,
        available: 'AVAILABLE',
      },
    });

    console.log('RESULTADO: ', result);

    if (result.count !== 1) {
      return res.status(409).json({
        error: 'El horario no está disponible o no existe',
      });
    }

    const updated = await prisma.sRScheduling.findUnique({ where: { id: scheduleId } });
    return res.json(updated);

  } catch (error) {
    console.log('ERROR PATCH /schedules/cancel:', error);
    return res.status(500).json({ error: 'No se pudo cancelar la reserva' });
  }
});

// PATCH /schedules/checkin
router.patch('/checkin', async (req, res) => {
  try {
    const { scheduleId, userId } = req.body || {};

    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const where = {
      id: scheduleId,
      available: 'UNAVAILABLE',
      is_finished: false,
      status: 'PENDING',
      user_id: userId
    };

    console.log(where);

    await prisma.sRScheduling.update({
      where: {
        id: scheduleId,
        available: 'UNAVAILABLE',
        is_finished: false,
        status: 'PENDING',
        user_id: userId
      },
      data: {
        status: 'PRESENT'
      },
    });

    const updated = await prisma.sRScheduling.findUnique({ where: { id: scheduleId } });
    return res.json(updated);

  } catch (error) {
    console.log('ERROR PUT /srSchedules/checkout', error);
    return res.status(500).json({ error: 'No se pudo hacer checkout' });
  }
});

// PATCH /schedules/checkout
router.patch('/checkout', async (req, res) => {
  try {
    const { scheduleId, userId } = req.body || {};

    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await prisma.sRScheduling.update({
      where: {
        id: scheduleId,
        available: 'UNAVAILABLE',
        is_finished: false,
        status: 'PRESENT',
        user_id: userId
      },
      data: {
        is_finished: true
      },
    });

    const updated = await prisma.sRScheduling.findUnique({ where: { id: scheduleId } });
    return res.json(updated);

  } catch (error) {
    console.log('ERROR PUT /srSchedules/checkout', error);
    return res.status(500).json({ error: 'No se pudo hacer checkout' });
  }
});

// DELETE /schedules/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });

    await prisma.sRScheduling.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Horario no encontrado' });
    console.log('ERROR DELETE /schedules/:id:', error);
    res.status(500).json({ error: 'No se pudo eliminar el horario' });
  }
});

// ENDPOINTS DE ADMIN
// PATCH /schedules/enable
router.patch('/enable', async (req, res) => {
  try {
    const { scheduleId, adminId } = req.body || {};

    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const user = await prisma.User.findUnique({ where: { id: adminId } });

    if (user.role !== 'ADMIN') {
      return res.status(401).json({ error: 'Unauthorized, must be a CAI admin' });
    }

    await prisma.sRScheduling.update({
      where: {
        id: scheduleId,
        available: 'MAINTENANCE',
        is_finished: false,
      },
      data: {
        available: 'AVAILABLE',
        user_id: null
      },
    });

    const updated = await prisma.sRScheduling.findUnique({ where: { id: scheduleId } });
    return res.json(updated);

  } catch (error) {
    console.log('ERROR PATCH /srSchedules/enable', error);
    return res.status(500).json({ error: 'No se pudo habilitar la sala' });
  }
});

// PATCH /schedules/disable
router.patch('/disable', async (req, res) => {
  try {
    const { scheduleId, adminId } = req.body || {};

    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const user = await prisma.User.findUnique({ where: { id: adminId } });

    if (user.role !== 'ADMIN') {
      return res.status(401).json({ error: 'Unauthorized, must be a CAI admin' });
    }

    await prisma.sRScheduling.update({
      where: {
        id: scheduleId,
        available: 'AVAILABLE',
        is_finished: false,
      },
      data: {
        available: 'MAINTENANCE',
        user_id: null
      },
    });

    const updated = await prisma.sRScheduling.findUnique({ where: { id: scheduleId } });
    return res.json(updated);

  } catch (error) {
    console.log('ERROR PATCH /srSchedules/enable', error);
    return res.status(500).json({ error: 'No se pudo habilitar la sala' });
  }
});

// PATCH /schedules/cancel/admin
router.patch('/cancel/admin', async (req, res) => {
  try {
    const { scheduleId, adminId } = req.body || {};

    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const user = await prisma.User.findUnique({ where: { id: adminId } });

    if (user.role !== 'ADMIN') {
      return res.status(401).json({ error: 'Unauthorized, must be a CAI admin' });
    }

    await prisma.sRScheduling.updateMany({
      where: {
        id: scheduleId,
        available: 'UNAVAILABLE'
      },
      data: {
        user_id: null,
        available: 'AVAILABLE'
      },
    });

    const updated = await prisma.sRScheduling.findUnique({ where: { id: scheduleId } });
    return res.json(updated);

  } catch (error) {
    console.log('ERROR PATCH /schedules/cancel:', error);
    return res.status(500).json({ error: 'No se pudo cancelar la reserva' });
  }
});

// PATCH /schedules/refresh
router.patch('/refresh', async (ctx) => {
  console.log('>>> [refresh] Inicio handler SIMPLE');
  try {
    const updated = await prisma.$executeRaw`
      UPDATE "public"."SRScheduling"
      SET "day" = "day" + INTERVAL '7 days'
      WHERE 1=1
    `;

    console.log('>>> [refresh] Filas actualizadas =', updated);

    ctx.status = 200;
    ctx.body = {
      ok: true,
      message: 'Reservas movidas 7 días hacia adelante',
      updatedCount: Number(updated),
    };
    console.log('>>> [refresh] Respuesta enviada OK (SIMPLE)');
  } catch (err) {
    console.error('>>> [refresh] ERROR SIMPLE:', err);
    ctx.status = 500;
    ctx.body = { error: 'Error al refrescar las salas de estudio' };
  }
});


module.exports = router;
