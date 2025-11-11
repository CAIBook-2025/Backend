const { prisma } = require('../lib/prisma');

class userUpdater {
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
}

module.exports = new userUpdater();