const { prisma } = require('../lib/prisma');

class UserFetcher {
  async getUserById(id) {
    try {
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        return {
          status: 404,
          body: { error: 'Usuario no encontrado' }
        };
      }

      const completeUserProfileData = await this.getUserCompleteProfileData(user);

      return {
        status: 200,
        body: completeUserProfileData
      };

    } catch (error) {
      console.error('Error al obtener usuario por ID:', error);
      return {
        status: 500,
        body: { error: 'Error interno del servidor.' }
      };
    }
  }

  async getUserByIdBeingAdmin(id, admin_auth0_id) {
    try {
      if (!admin_auth0_id) {
        return {
          status: 403,
          body: { error: 'No tienes permisos para acceder a este recurso.' }
        };
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return {
          status: 404,
          body: { error: 'Usuario no encontrado' }
        };
      }

      const completeUserProfileData = await this.getUserCompleteProfileData(user);

      return {
        status: 200,
        body: completeUserProfileData
      };
    } catch (error) {
      console.error('Error al obtener usuario por ID siendo admin:', error);
      return {
        status: 500,
        body: { error: 'Error interno del servidor.' }
      };
    }
  }

  async getUserProfile( auth0_id ) {
    try {
      const user = await prisma.user.findUnique({
        where: { auth0_id: auth0_id }
      });

      if (!user) {
        return {
          status: 404,
          body: { error: 'Usuario no encontrado' }
        };
      }

      const completeUserProfileData = await this.getUserCompleteProfileData(user);

      return {
        status: 200,
        body: completeUserProfileData
      };
    } catch (error) {
      console.error('Error al obtener el perfil del usuario:', error);
      return {
        status: 500,
        body: { error: 'Error interno del servidor.' }
      };
    }
  }

  async getUserCompleteProfileData(user) {
    const [schedules, strikes, attendances] = await Promise.all([
      this.getUserSchedules(user),
      this.getUserStrikes(user),
      this.getUserAttendances(user)
    ]);

    const upcomingEvents = await this.filterUpcomingEvents(attendances);
    const reservasActivas = await this.filterActiveReservations(schedules);
    const completeData = await this.formatCompleteUserProfileData(user, reservasActivas, strikes, attendances, upcomingEvents);
    
    return completeData;
  }

  async getUserSchedules(user) {
    // Reservas de salas del usuario (SRScheduling) + sala
    return prisma.sRScheduling.findMany({
      where: { user_id: user.id }, // "activas" = desde hoy
      include: { studyRoom: true },
      orderBy: [{ day: 'asc' }, { module: 'asc' }],
    });
  }

  async getUserStrikes(user) {
    // Strikes recibidos por el estudiante
    return prisma.strike.findMany({
      where: { student_id: user.id },
      orderBy: { date: 'desc' },
    });

  }

  async getUserAttendances(user) {
    // Asistencias del usuario a eventos (+ evento y + solicitud del evento para el nombre)
    return prisma.attendance.findMany({
      where: { student_id: user.id },
      include: {
        event: {                    // EventsScheduling
          include: { eventRequest: true }, // para obtener "name", "goal", etc.
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async filterUpcomingEvents(userAttendances) {
    const now = new Date();
    const upcomingEvents = userAttendances
      .filter(a => a.event?.start_time && a.event.start_time >= now)
      .map(a => ({
        id: a.event.id,
        title: a.event.eventRequest?.name ?? 'Evento',
        start: a.event.start_time,
        end: a.event.end_time,
        status: 'DISPONIBLE',
      }))
      .sort((a, b) => +new Date(a.start) - +new Date(b.start));

    return upcomingEvents;
  }

  async filterActiveReservations(userSchedules) {
    const reservasActivas = userSchedules.map(s => ({
      id: s.id,
      roomName: s.studyRoom?.name ?? 'Sala',
      location: s.studyRoom?.location ?? '',
      day: s.day,
      module: s.module,
      status: s.status,
      available: s.available,
      isFinished: s.is_finished
    }));
    return reservasActivas;
  }

  async formatCompleteUserProfileData(user, activeReservations, strikes, attendances, upcomingEvents) {
    const completeData = {
      user,
      schedule: activeReservations,
      scheduleCount: activeReservations.length,
      strikes,
      strikesCount: strikes.length,
      upcomingEvents,
      upcomingEventsCount: upcomingEvents.length,
      attendances,
      attendancesCount: attendances.length
    };
    return completeData;
  }
}

module.exports = new UserFetcher();