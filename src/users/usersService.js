const { prisma } = require('../lib/prisma');
const { getMachineToMachineToken } = require('../utils/auth0_utils');
const crypto = require('crypto');

class UsersService {
  async createUser(userData) {

    const user = await prisma.user.create({
      data: {...userData}
    });
    return user; 
  }

  async createAdminUser(createAdminUserRequestData) {

    const machineToMachineToken = await getMachineToMachineToken();
    const newAdminUserEmail = createAdminUserRequestData.email.toLowerCase();
    const newAdminUserPassword = this.createAdminUserPassword();
    const newAdminUserAuth0 = await this.createAdminUserInAuth0(newAdminUserEmail, newAdminUserPassword, machineToMachineToken);
    const adminUser = await this.createAdminUserInOwnDB(newAdminUserAuth0, newAdminUserEmail);
    return {
      status: 'success',
      adminUser: adminUser,
      tempPassword: newAdminUserPassword
    }; 
  }

  createAdminUserPassword() {
    const randomPart = crypto.randomBytes(8).toString('base64url');
    return `Admin#${randomPart}-2025`;
  }

  async createAdminUserInAuth0(email, password, machineToMachineToken) {
    try {
      const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${machineToMachineToken}`
        },
        body: JSON.stringify({
          email: email,
          password: password,
          connection: 'Username-Password-Authentication',
          email_verified: false,
          verify_email: false
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating user in Auth0:', error);
      throw error;
    }
  }

  async createAdminUserInOwnDB(newAdminUserAuth0, newAdminUserEmail) {
    try {
      const adminUser = await prisma.user.create({
        data: {
          auth0_id: newAdminUserAuth0.user_id,
          email: newAdminUserEmail,
          first_name: 'actualizar',
          last_name: 'actualizar',
          role: 'ADMIN',
          is_representative: false,
          is_moderator: false,
          career: 'admin cai',
          phone: '1',
          student_number: '1',
        }
      });
      return adminUser;
    } catch (error) {
      console.error('Error creating admin user in own DB:', error);
      throw error;
    }
  }
}

module.exports = new UsersService();