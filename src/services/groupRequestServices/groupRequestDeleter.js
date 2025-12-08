const { prisma } = require('../../lib/prisma');
const { NotFoundError, BadRequestError } = require('../../utils/appError');


class GroupRequestDeleter {
  async softDeleteGroupRequestById(group_request_id, student_auth0_id) {
    const groupRequest = await this.getGroupRequestById(group_request_id);
    this.checkIfGroupRequestExists(groupRequest);
    const userRequestingDeletion = await this.getUserRequestingDeletionByAuth0Id(student_auth0_id);
    this.checkIfUserRequestingDeletionExists(userRequestingDeletion);
    this.checkIfUserRequestingDeletionIsTheSameAsGroupRequestUser(userRequestingDeletion, groupRequest);
    const deletedGroupRequest = await this.softDeleteGroupRequestResources(group_request_id);
    return { message: 'Solicitud de grupo eliminada correctamente', groupRequest: deletedGroupRequest };
  }

  async adminSoftDeleteGroupRequestById(group_request_id) {
    const groupRequest = await this.getGroupRequestById(group_request_id);
    this.checkIfGroupRequestExists(groupRequest);
    const deletedGroupRequest = await this.softDeleteGroupRequestResources(group_request_id);
    return { message: 'Solicitud de grupo eliminada correctamente', groupRequest: deletedGroupRequest };
  }

  async getGroupRequestById(group_request_id) {
    return await prisma.groupRequest.findUnique({ where: { id: group_request_id, is_deleted: false } });
  }

  checkIfGroupRequestExists(groupRequest) {
    if (!groupRequest) {
      throw new NotFoundError('Solicitud de grupo no encontrada', 'GroupRequestDeleter.checkIfGroupRequestExists');
    }
  }

  async getUserRequestingDeletionByAuth0Id(student_auth0_id) {
    return await prisma.user.findUnique({ where: { auth0_id: student_auth0_id, is_deleted: false } });
  }

  checkIfUserRequestingDeletionExists(user) {
    if (!user) {
      throw new NotFoundError('Usuario no encontrado', 'GroupRequestDeleter.checkIfUserRequestingDeletionExists');
    }
  }

  checkIfUserRequestingDeletionIsTheSameAsGroupRequestUser(userRequestingDeletion, groupRequest) {
    if (groupRequest.user_id !== userRequestingDeletion.id) {
      throw new BadRequestError('No tienes permiso para eliminar esta solicitud de grupo', 'GroupRequestDeleter.checkIfUserRequestingDeletionIsTheSameAsGroupRequestUser');
    }
  }

  async softDeleteGroupRequestResources(group_request_id) {
    const deletedGroupRequest = await prisma.groupRequest.update({
      where: { id: group_request_id, is_deleted: false },
      data: {
        is_deleted: true,
        deletedAt: new Date()
      }
    });
    const groupOfGroupRequest = await prisma.group.findUnique({
      where: { group_request_id: group_request_id, is_deleted: false }
    });
    if (!groupOfGroupRequest) {
      return deletedGroupRequest;
    }
    await prisma.group.update({
      where: { group_request_id: group_request_id, is_deleted: false },
      data: {
        is_deleted: true,
        deletedAt: new Date()
      }
    });
    const eventRequestsFromGroup = await prisma.eventRequest.findMany({
      where: { group_id: groupOfGroupRequest.id, is_deleted: false }
    });
    const eventRequestIds = eventRequestsFromGroup.map(er => er.id);
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
        
    return deletedGroupRequest;
  }
}

module.exports = new GroupRequestDeleter();