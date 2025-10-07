const { prisma } = require('../lib/prisma');

class UsersService {
    async findOrCreateUser(auth0user) {
        console.log('auth0user:', auth0user);
        const auth0_id = auth0user.sub;
        
        let user = await prisma.user.findUnique({
            where: { auth0_id }
        });

        if (!user) {
            console.log('a crear un user', {auth0_id});
            user = await prisma.user.create({
                data: {
                    auth0_id: auth0_id,
                    email: '',
                    hashed_password: '', 
                    first_name: '', 
                    last_name: '',
                    role: 'STUDENT',
                    is_representative: false,
                    is_moderator: false,
                    strikes: 0
                }
            })
        } else {
            console.log('user ya existe', user);
        }

        return user;
    }
}

module.exports = new UsersService();