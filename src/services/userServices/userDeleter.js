const { prisma } = require('../../lib/prisma');
const { blockUserInAuth0, unblockUserInAuth0 } = require('../../utils/auth0_utils');
const { NotFoundError } = require('../../utils/appError');


class UserDeleter {
  async deleteUserById(id) {
    const deletedUser = await prisma.user.delete({ where: { id } });
    if (!deletedUser) {
      throw new NotFoundError('Usuario no encontrado', 'UserDeleter.deleteUserById');
    }
    return { message: 'Usuario eliminado correctamente', user: deletedUser };
  }

  async softDeleteOwnUser(auth0_id) {
    const user = await this.getUserByAuth0IdFromDB(auth0_id);
    this.checkIfUserExists(user);
    return await this.softDeleteUserResourcesInDB(user);
  }

  async softDeleteUserById(user_id) {
    const user = await this.getUserByIdFromDB(user_id);
    this.checkIfUserExists(user);
    return await this.softDeleteUserResourcesInDB(user);
  }

  async softDeleteUserResourcesInDB(user) {
    const user_id = user.id;
    const deletedUser = await this.softDeleteUserByIdInDB(user_id);
    await this.softDeleteUserGroupResourcesInDB(user_id);
    await this.freeStudyRoomSchedulesOfUserInDB(user_id);
    await this.deleteFeedbacksFromUserInDB(user_id);
    await this.deleteStrikesFromUserInDB(user_id);
    await this.deteleStrikesIfAdminInDB(user);
    await blockUserInAuth0(user.auth0_id);
    return { message: 'Usuario eliminado correctamente', user: deletedUser };
  }

  async getUserByIdFromDB(id) {
    return await prisma.user.findUnique({ where: { id } });
  }

  async getUserByAuth0IdFromDB(auth0_id) {
    return await prisma.user.findUnique({ where: { auth0_id } });
  }

  checkIfUserExists(user) {
    if (!user) {
      throw new NotFoundError('Usuario no encontrado', 'UserDeleter.checkIfUserExists');
    }
  }

  async softDeleteUserByIdInDB(user_id) {
    return await prisma.user.update({
      where: { id: user_id },
      data: { 
        is_deleted: true,
        deletedAt: new Date()
      }
    });
  }

  async softDeleteUserGroupResourcesInDB(user_id) {
    const groupRequestsFromUser = await prisma.groupRequest.findMany({
      where: { user_id: user_id, is_deleted: false },
      select: { id: true }
    });

    const groupRequestIdsFromUser = groupRequestsFromUser.map(gr => gr.id);

    await prisma.groupRequest.updateMany({
      where: { id: { in: groupRequestIdsFromUser }, is_deleted: false },
      data: { is_deleted: true, deletedAt: new Date() }
    });

    const groupsFromUser = await prisma.group.findMany({
      where: { group_request_id: { in: groupRequestIdsFromUser }, is_deleted: false },
      select: { id: true }
    });

    const groupIdsFromUser = groupsFromUser.map(g => g.id);

    await prisma.group.updateMany({
      where: { id: { in: groupIdsFromUser }, is_deleted: false },
      data: { is_deleted: true, deletedAt: new Date() }
    });

    const eventRequestsFromUserGroups = await prisma.eventRequest.findMany({
      where: { group_id: { in: groupIdsFromUser }, is_deleted: false },
      select: { id: true }
    });

    const eventRequestIdsFromUserGroups = eventRequestsFromUserGroups.map(er => er.id);

    await prisma.eventRequest.updateMany({
      where: { id: { in: eventRequestIdsFromUserGroups }, is_deleted: false },
      data: { is_deleted: true, deletedAt: new Date() }
    });

    const feedbacksFromEventsOfUserGroups = await prisma.feedback.findMany({
      where: { event_id: { in: eventRequestIdsFromUserGroups } },
      select: { id: true }
    });

    const feedbackIdsFromEventsOfUserGroups = feedbacksFromEventsOfUserGroups.map(fb => fb.id);

    await prisma.feedback.deleteMany({
      where: { id: { in: feedbackIdsFromEventsOfUserGroups }, },
    });
  }

  async freeStudyRoomSchedulesOfUserInDB(user_id) {
    await prisma.sRScheduling.updateMany({
      where: { user_id },
      data: { 
        user_id: null,
        available: 'AVAILABLE',
        is_finished: false
      },
    });
  }

  async deleteFeedbacksFromUserInDB(user_id) {
    await prisma.feedback.deleteMany({
      where: { student_id: user_id },
    });
  }

  async deleteStrikesFromUserInDB(user_id) {
    await prisma.strike.deleteMany({
      where: { student_id: user_id },
    });
  }

  async deteleStrikesIfAdminInDB(user) {
    if (user.role === 'ADMIN') {
      await prisma.strike.deleteMany({
        where: { admin_id: user.id },
      });
    }
  }

  async restoreSoftDeletedUserById(user_id) {
    const user = await this.getUserByIdFromDB(user_id);
    this.checkIfUserExists(user);
    const restoredUser = await this.restoreUserResourcesInDB(user_id);
    await unblockUserInAuth0(user.auth0_id);
    return { message: 'Usuario restaurado correctamente', user: restoredUser };
  }

  async restoreUserResourcesInDB(user_id) {
    return await prisma.user.update({
      where: { id: user_id },
      data: { 
        is_deleted: false,
        deletedAt: null
      }
    });
  }
}

module.exports = new UserDeleter();