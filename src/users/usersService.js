const { prisma } = require('../lib/prisma');

class UsersService {
  async createUser(userData) {
    console.log("ENTRA ACÁ");

    // Elimina el campo si existe
    const { hashed_password, ...filteredData } = userData;

    const user = await prisma.user.create({
      data: filteredData
    });

    return user;
  }
}


module.exports = new UsersService();