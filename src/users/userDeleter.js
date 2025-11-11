const { prisma } = require('../lib/prisma');
const { blockUserInAuth0, unblockUserInAuth0 } = require('../utils/auth0_utils');


class UserDeleter {
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

module.exports = new UserDeleter();