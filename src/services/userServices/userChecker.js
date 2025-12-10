const { prisma } = require('../../lib/prisma');

class UserChecker {
  async userHasBeenCreatedInOwnDB(auth0_id) {
    const user = await prisma.user.findUnique({ where: { auth0_id: auth0_id } });
    if (user) {
      return { exists: true, user };
    } else {
      return { exists: false };
    }
  }

  async userIsSuperAdmin(auth0_id) {
    const user = await prisma.user.findUnique({ where: { auth0_id: auth0_id } });
    if (user && user.role === 'SUPERADMIN') {
      return true;
    } else {
      return false;
    }
  }
}

module.exports = new UserChecker();