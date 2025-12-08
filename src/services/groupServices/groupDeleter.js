const { prisma } = require('../../lib/prisma');
const { NotFoundError, BadRequestError } = require('../../utils/appError');

class GroupDeleter {
  async softDeleteGroupAsRepresentative(group_id, representative_auth0_id) {
    const group = await this.getGroupById(group_id);
    this.checkIfGroupExists(group);
    const representativeUser = await this.getRepresentativeUserByAuth0Id(representative_auth0_id);
    this.checkIfRepresentativeUserExists(representativeUser);
    this.checkIfUserIsRepresentativeOfGroup(group, representativeUser.id);
    const deletedGroup = await this.softDeleteGroupResources(group_id);
    return { message: 'Grupo eliminado correctamente', group: deletedGroup };
  }

  async softDeleteGroupAsAdmin(group_id) {
    const group = await this.getGroupById(group_id);
    this.checkIfGroupExists(group);
    const deletedGroup = await this.softDeleteGroupResources(group_id);
    return { message: 'Grupo eliminado correctamente', group: deletedGroup };
  }

  async getGroupById(group_id) {
    return await prisma.group.findUnique({ where: { id: group_id, is_deleted: false } });
  }

  checkIfGroupExists(group) {
    if (!group) {
      throw new NotFoundError('Grupo no encontrado', 'GroupDeleter.checkIfGroupExists');
    }
  }

  async getRepresentativeUserByAuth0Id(representative_auth0_id) {
    return await prisma.user.findUnique({ where: { auth0_id: representative_auth0_id, is_deleted: false } });
  }

  checkIfRepresentativeUserExists(user) {
    if (!user) {
      throw new NotFoundError('Usuario representante no encontrado', 'GroupDeleter.checkIfRepresentativeUserExists');
    }
  }

  checkIfUserIsRepresentativeOfGroup(group, representative_user_id) {
    if (group.repre_id !== representative_user_id) {
      throw new BadRequestError('No tienes permiso para eliminar este grupo', 'GroupDeleter.checkIfUserIsRepresentativeOfGroup');
    }
  }

  async softDeleteGroupResources(group_id) {
    const deletedGroup = await prisma.group.update({
      where: { id: group_id, is_deleted: false },
      data: {
        is_deleted: true,
        deletedAt: new Date()
      }
    });
    const groupRequestOfGroup = await prisma.groupRequest.findUnique({
      where: { id: deletedGroup.group_request_id, is_deleted: false }
    });
    if (groupRequestOfGroup) {
      await prisma.groupRequest.update({
        where: { id: groupRequestOfGroup.id, is_deleted: false },
        data: {
          is_deleted: true,
          deletedAt: new Date()
        }
      });
    }
    const eventRequestsOfGroup = await prisma.eventRequest.findMany({
      where: { group_id: group_id, is_deleted: false }
    });
    const eventRequestIds = eventRequestsOfGroup.map(eventRequest => eventRequest.id);
    await prisma.eventRequest.updateMany({
      where: { id: { in: eventRequestIds }, is_deleted: false },
      data: {
        is_deleted: true,
        deletedAt: new Date()
      }
    });
    await prisma.feedback.deleteMany({
      where: { event_id: { in: eventRequestIds } }
    });
    return deletedGroup;
  }
}

module.exports = new GroupDeleter();