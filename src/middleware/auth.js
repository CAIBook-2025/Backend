const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const { prisma } = require('../lib/prisma');
const { ForbiddenError } = require('../utils/appError');

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    cache: true,
    rateLimit: true,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

const checkAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { auth0_id: req.auth.sub },
    });
    
    if (!user) {
      throw new ForbiddenError('Acceso denegado: no se encontró el usuario en la base de datos.', 'checkAdmin.middleware');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenError('Acceso denegado: el usuario no es un administrador.', 'checkAdmin.middleware');
    }

    next();
  } catch (error) {
    console.log('ERROR en middleware checkAdmin:\n', error);
    return res.status(error.status || 500).json({ error: error.message || 'Error interno del servidor.' });
  }

};

module.exports = { checkJwt, checkAdmin };