const { prisma } = require('../lib/prisma');
const { blockUserInAuth0, unblockUserInAuth0 } = require('../utils/auth0_utils');
const { NotFoundError } = require('../utils/appError');


class UserDeleter {
  async deleteUserById(id) {
    const deletedUser = await prisma.user.delete({ where: { id } });
    if (!deletedUser) {
      throw new NotFoundError('Usuario no encontrado', 'UserDeleter.deleteUserById');
    }
    return { message: 'Usuario eliminado correctamente', user: deletedUser };
  }

  async softDeleteUserById(id) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado', 'UserDeleter.softDeleteUserById');
    }

    const deletedUser = await prisma.user.update({
      where: { id },
      data: { 
        is_deleted: true,
        // deletedAt: new Date() - Solo cuando Dussan lo agregue
      }
    });

    await blockUserInAuth0(user.auth0_id);

    return { message: 'Usuario eliminado correctamente', user: deletedUser };
  }

  async softDeleteOwnUser(auth0_id) {
    const user = await prisma.user.findUnique({ where: { auth0_id } });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado', 'UserDeleter.softDeleteOwnUser');
    }

    const deletedUser = await prisma.user.update({
      where: { auth0_id },
      data: { 
        is_deleted: true,
        // deletedAt: new Date() - Solo cuando Dussan lo agregue
      }
    });

    await blockUserInAuth0(auth0_id);

    return { message: 'Usuario eliminado correctamente', user: deletedUser };
  }

  async restoreSoftDeletedUserById(id) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado', 'UserDeleter.restoreSoftDeletedUserById');
    }

    const restoredUser = await prisma.user.update({
      where: { id },
      data: { 
        is_deleted: false,
        // deletedAt: null - Solo cuando Dussan lo agregue
      }
    });

    await unblockUserInAuth0(user.auth0_id);

    return { message: 'Usuario restaurado correctamente', user: restoredUser };
  }
}

module.exports = new UserDeleter();