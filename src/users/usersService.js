const { prisma } = require('../lib/prisma');
const { getMachineToMachineToken } = require('../utils/auth0_utils');
const crypto = require('crypto');
const { blockUserInAuth0, unblockUserInAuth0 } = require('../utils/auth0_utils');

class UsersService {
  async createUserInOwnDB(userData) {
    try {
      const existingUser = await prisma.user.findUnique({ 
        where: { auth0_id: userData.auth0_id },
      });

      if (existingUser) {
        return {
          status: 400,
          body: { error: 'El usuario ya existe en la base de datos.' }
        };
      }

      const user = await prisma.user.create({
        data: {
          ...userData,
          role: 'STUDENT' // rol default
        }
      });

      return {
        status: 200,
        body: user
      };

    } catch (error) {
      console.error('Error creating user in own DB:', error);
      throw error;
    }
  }

  async createAdminUser(createAdminUserRequestData) {
    const machineToMachineToken = await getMachineToMachineToken();
    const newAdminUserEmail = createAdminUserRequestData.email.toLowerCase();
    const newAdminUserPassword = this.createAdminUserPassword();
    const newAdminUserAuth0 = await this.createAdminUserInAuth0(newAdminUserEmail, newAdminUserPassword, machineToMachineToken);
    const adminUser = await this.createAdminUserInOwnDB(newAdminUserAuth0, newAdminUserEmail);
    return {
      status: 'success',
      adminUser: adminUser,
      tempPassword: newAdminUserPassword
    };
  }

  createAdminUserPassword() {
    const randomPart = crypto.randomBytes(8).toString('base64url');
    return `Admin#${randomPart}-2025`;
  }

  async createAdminUserInAuth0(email, password, machineToMachineToken) {
    try {
      const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${machineToMachineToken}`
        },
        body: JSON.stringify({
          email: email,
          password: password,
          connection: 'Username-Password-Authentication',
          email_verified: false,
          verify_email: false
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating user in Auth0:', error);
      throw error;
    }
  }

  async createAdminUserInOwnDB(newAdminUserAuth0, newAdminUserEmail) {
    try {
      const adminUser = await prisma.user.create({
        data: {
          auth0_id: newAdminUserAuth0.user_id,
          email: newAdminUserEmail,
          first_name: 'actualizar',
          last_name: 'actualizar',
          role: 'ADMIN',
          is_representative: false,
          is_moderator: false,
          career: 'admin cai',
          phone: '1',
          student_number: '1',
        }
      });
      return adminUser;
    } catch (error) {
      console.error('Error creating admin user in own DB:', error);
      throw error;
    }
  }

  async promoteUserToAdmin(user_id) {
    try {
      const user = await prisma.user.findUnique({ where: { id: user_id } });

      if (!user) {
        return {
          status: 404,
          body: { error: 'Usuario no encontrado.' }
        };
      }

      if (user.role === 'ADMIN') {
        return {
          status: 200,
          body: { message: 'El usuario ya es administrador.' }
        };
      }

      const updatedUser = await prisma.user.update({
        where: { id: user_id },
        data: { role: 'ADMIN' }
      });

      return {
        status: 200,
        body: {
          message: 'Usuario promovido a administrador correctamente.',
          user: updatedUser
        }
      };

    } catch (error) {
      console.error('Error al promover usuario a admin:', error);
      return {
        status: 500,
        body: { error: 'Error interno del servidor.' }
      };
    }
  }

  async updateUser(auth0_id, updateData) {
    try {
      const user = await prisma.user.findUnique({ where: { auth0_id } });

      if (!user) {
        return {
          status: 404,
          body: { error: 'Usuario no encontrado' }
        };
      }

      const allowedFields = ['first_name', 'last_name', 'phone', 'career', 'student_number'];

      const filteredData = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, {});

      if (Object.keys(filteredData).length === 0) {
        return {
          status: 400,
          body: { error: 'No hay campos válidos para actualizar.' }
        };
      }

      const updatedUser = await prisma.user.update({
        where: { auth0_id },
        data: filteredData
      });

      return {
        status: 200,
        body: updatedUser
      };

    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      return {
        status: 500,
        body: { error: 'Error interno del servidor.' }
      };
    }
  }

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

  async deleteUserById(id) {
    try {
      const deletedUser = await prisma.user.delete({ where: { id } });
      return {
        status: 200,
        body: { message: 'Usuario eliminado correctamente', user: deletedUser }
      };
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);
      return {
        status: 500,
        body: { error: 'Error interno del servidor.' }
      };
    }
  }

  async softDeleteUserById(id) {
    try {
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        return {
          status: 404,
          body: { error: 'Usuario no encontrado' }
        };
      }

      const deletedUser = await prisma.user.update({
        where: { id },
        data: { 
          is_deleted: true,
          // deletedAt: new Date() - Solo cuando Dussan lo agregue
        }
      });

      await blockUserInAuth0(user.auth0_id);

      return {
        status: 200,
        body: { message: 'Usuario eliminado correctamente', user: deletedUser }
      };
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);
      return {
        status: 500,
        body: { error: 'Error interno del servidor.' }
      };
    }
  }

  async softDeleteOwnUser(auth0_id) {
    try {
      const user = await prisma.user.findUnique({ where: { auth0_id } });

      if (!user) {
        return {
          status: 404,
          body: { error: 'Usuario no encontrado' }
        };
      }

      const deletedUser = await prisma.user.update({
        where: { auth0_id },
        data: { 
          is_deleted: true,
          // deletedAt: new Date() - Solo cuando Dussan lo agregue
        }
      });

      await blockUserInAuth0(auth0_id);

      return {
        status: 200,
        body: { message: 'Usuario eliminado correctamente', user: deletedUser }
      };
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);
      return {
        status: 500,
        body: { error: 'Error interno del servidor.' }
      };
    }
  }

  async restoreSoftDeletedUserById(id) {
    try {
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        return {
          status: 404,
          body: { error: 'Usuario no encontrado' }
        };
      }

      const restoredUser = await prisma.user.update({
        where: { id },
        data: { 
          is_deleted: false,
          // deletedAt: null - Solo cuando Dussan lo agregue
        }
      });

      await unblockUserInAuth0(user.auth0_id);

      return {
        status: 200,
        body: { message: 'Usuario restaurado correctamente', user: restoredUser }
      };
    } catch (error) {
      console.error('Error al restaurar el usuario:', error);
      return {
        status: 500,
        body: { error: 'Error interno del servidor.' }
      };
    }
  }
}

module.exports = new UsersService();