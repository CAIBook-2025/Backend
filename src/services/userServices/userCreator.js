const { prisma } = require('../../lib/prisma');
const { getMachineToMachineToken } = require('../../utils/auth0_utils');
const crypto = require('crypto');
const { BadRequestError } = require('../../utils/appError');

class UserCreator {
  async createUserInOwnDB(userData) {
    const { email, first_name, last_name, auth0_id, career, phone, student_number } = userData;
    const necesaryFields = { 'email': email, 'primer nombre': first_name, 'apellido': last_name, 'auth0_id': auth0_id, 'carrera': career, 'teléfono': phone, 'número de estudiante': student_number };

    for (const [key, value] of Object.entries(necesaryFields)) {
      if (!value) {
        throw new BadRequestError(`El campo '${key}' es requerido para crear un usuario`, 'UserCreator.createUserInOwnDB');
      }
    }

    const sanitizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { auth0_id } });
    if (existingUser) {
      throw new BadRequestError('Ya existe un usuario con el auth0_id proporcionado', 'UserCreator.createUserInOwnDB');
    }

    const checkUserByEmail = await prisma.user.findUnique({ where: { email: sanitizedEmail } });
    if (checkUserByEmail) {
      throw new BadRequestError('Ya existe un usuario con el email proporcionado', 'UserCreator.createUserInOwnDB');
    }

    const user = await prisma.user.create({
      data: {
        email: sanitizedEmail,
        first_name,
        last_name,
        auth0_id,
        career,
        phone,
        student_number,
      }
    });

    return user;
  }

  async createAdminUser(createAdminUserRequestData) {
    const machineToMachineToken = await getMachineToMachineToken();
    const newAdminUserEmail = createAdminUserRequestData.email.toLowerCase();
    const newAdminUserPassword = this.createAdminUserPassword();
    const newAdminUserAuth0 = await this.createAdminUserInAuth0(newAdminUserEmail, newAdminUserPassword, machineToMachineToken);
    const adminUser = await this.createAdminUserInOwnDB(newAdminUserAuth0, createAdminUserRequestData);
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

  async createAdminUserInOwnDB(newAdminUserAuth0, newAdminUserRequestData) {
    try {
      const adminUser = await prisma.user.create({
        data: {
          auth0_id: newAdminUserAuth0.user_id,
          email: newAdminUserRequestData.email.toLowerCase(),
          first_name: newAdminUserRequestData.first_name,
          last_name: newAdminUserRequestData.last_name,
          role: 'ADMIN',
          career: newAdminUserRequestData.career || 'admin cai',
          phone: newAdminUserRequestData.phone || '1',
          student_number: newAdminUserRequestData.student_number || 'ADMIN-' + Date.now(),
        }
      });
      return adminUser;
    } catch (error) {
      console.error('Error creating admin user in own DB:', error);
      throw error;
    }
  }
}

module.exports = new UserCreator();