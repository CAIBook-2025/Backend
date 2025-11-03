const { prisma } = require('../lib/prisma');

class UsersService {
  async createUser(userData) {
    const user = await prisma.user.create({
      data: {...userData}
    });

    return user; 
  }
}

module.exports = new UsersService();