const { prisma } = require('../lib/prisma');

class UsersService {
    async findOrCreateUser(auth0user) {
        const auth0Id = auth0user.sub;
        const email = auth0user.email;
        const name = auth0user.name;
        
        let user = await prisma.user.findUnique({
            where: { auth0Id }
        });

        if (!user) {
            user = await prisma.user.create({
                data: { auth0Id, email, name }
            });
        }

        return user;
    }
}

module.exports = new UsersService();