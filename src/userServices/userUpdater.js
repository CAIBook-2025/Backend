const { prisma } = require('../lib/prisma');
const { NotFoundError, BadRequestError } = require('../utils/appError');

class userUpdater {
  async promoteUserToAdmin(user_id) {
    const user = await prisma.user.findUnique({ where: { id: user_id } });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado', 'userUpdater.promoteUserToAdmin');
    }

    if (user.role === 'ADMIN') {
      return { message: 'El usuario ya es administrador.' };
    }

    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: { role: 'ADMIN' }
    });

    return updatedUser;
  }

  async updateUser(auth0_id, updateData) {
    const user = await prisma.user.findUnique({ where: { auth0_id } });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado', 'userUpdater.updateUser');
    }

    const allowedFields = ['first_name', 'last_name', 'phone', 'career', 'student_number'];

    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    if (Object.keys(filteredData).length === 0) {
      throw new BadRequestError('No hay campos válidos para actualizar.', 'userUpdater.updateUser');
    }

    const updatedUser = await prisma.user.update({
      where: { auth0_id },
      data: filteredData
    });

    return updatedUser;
  }
}

module.exports = new userUpdater();