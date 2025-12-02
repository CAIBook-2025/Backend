const { prisma } = require('../../lib/prisma');
const { ForbiddenError, NotFoundError } = require('../../utils/appError');

class UserFetcher {
  async getAllUsers(takeQuery, pageQuery) {
    const take = Math.min(Math.max(takeQuery || 20, 1), 100);
    const page = Math.max(pageQuery || 1, 1);
    const skip = (page - 1) * take;

    const [items, total] = await Promise.all([
      prisma.user.findMany({ take, skip, orderBy: { id: 'asc' } }),
      prisma.user.count()
    ]);
    return { page, take, total, items };
  }

  async getUserById(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('Usuario no encontrado', 'UserFetcher.getUserById');
    const completeUserProfileData = await this.getUserCompleteProfileData(user);
    return completeUserProfileData;
  }

  async getUserByIdBeingAdmin(id, admin_auth0_id) {
    if (!admin_auth0_id) {
      throw new ForbiddenError('UserFetcher.getUserByIdBeingAdmin');
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('Usuario no encontrado', 'UserFetcher.getUserByIdBeingAdmin');
    }
    const completeUserProfileData = await this.getUserCompleteProfileData(user);
    return completeUserProfileData;
  }

  async getUserProfile( auth0_id ) {
    const user = await prisma.user.findUnique({
      where: { auth0_id: auth0_id }
    });
    if (!user) {
      throw new NotFoundError('Usuario no encontrado', 'UserFetcher.getUserProfile');
    }
    const completeUserProfileData = await this.getUserCompleteProfileData(user);
    return completeUserProfileData;
  }

  async getUserCompleteProfileData(user) {
    const [schedules, strikes, activeSchedules, pendingGroupRequests] = await Promise.all([
      this.getUserSchedules(user),
      this.getUserStrikes(user),
      this.getCurrentUserSchedules(user),
      this.getUserGroupRequests(user)
      // this.getUserAttendances(user)
    ]);

    // const upcomingEvents = await this.filterUpcomingEvents(attendances);
    const reservasActivas = await this.filterActiveReservations(schedules);
    const completeData = await this.formatCompleteUserProfileData(user, reservasActivas, strikes, activeSchedules.length, pendingGroupRequests.length);
    
    return completeData;
  }

  async getUserSchedules(user) {
    // Reservas de salas del usuario (SRScheduling) + sala

    return prisma.SRScheduling.findMany({
      where: { user_id: user.id }, // "activas" = desde hoy
      include: { studyRoom: true },
      orderBy: [{ day: 'asc' }, { module: 'asc' }],
    });
  }

  async getCurrentUserSchedules(user) {
    return prisma.SRScheduling.findMany({
      where: { user_id: user.id, is_finished: false },
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

  async getUserGroupRequests(user) {
    return prisma.GroupRequest.findMany({
      where: { user_id: user.id, status: 'PENDING' },
    });
  }

  // async getUserAttendances(user) {
  //   // Asistencias del usuario a eventos (+ evento y + solicitud del evento para el nombre)
  //   return prisma.attendance.findMany({
  //     where: { student_id: user.id },
  //     include: {
  //       event: {                    // EventsScheduling
  //         include: { eventRequest: true }, // para obtener "name", "goal", etc.
  //       },
  //     },
  //     orderBy: { createdAt: 'desc' },
  //   });
  // }

  // async filterUpcomingEvents(userAttendances) {
  //   const now = new Date();
  //   const upcomingEvents = userAttendances
  //     .filter(a => a.event?.start_time && a.event.start_time >= now)
  //     .map(a => ({
  //       id: a.event.id,
  //       title: a.event.eventRequest?.name ?? 'Evento',
  //       start: a.event.start_time,
  //       end: a.event.end_time,
  //       status: 'DISPONIBLE',
  //     }))
  //     .sort((a, b) => +new Date(a.start) - +new Date(b.start));

  //   return upcomingEvents;
  // }

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

  async formatCompleteUserProfileData(user, activeReservations, strikes, activeSchedules, pendingGroupRequests
    // attendances, 
    // upcomingEvents
  ) {
    const completeData = {
      user,
      schedule: activeReservations,
      scheduleCount: activeReservations.length,
      strikes,
      strikesCount: strikes.length,
      activeSchedules,
      pendingGroupRequests
      // upcomingEvents,
      // upcomingEventsCount: upcomingEvents.length,
      // attendances,
      // attendancesCount: attendances.length
    };
    return completeData;
  }
}

module.exports = new UserFetcher();