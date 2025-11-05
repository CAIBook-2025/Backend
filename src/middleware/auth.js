const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const { prisma } = require('../lib/prisma');

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
  console.log('Checking admin role for user:', req.auth);
  const user = await prisma.user.findUnique({ 
    where: { auth0_id: req.auth.sub },
  });
   
  if (!user) {
    return res.status(403).json({ 
      error: 'Acceso denegado: no se encontró el usuario en la base de datos.',
      mensaje: 'Debes tener una cuenta válida para acceder a este recurso.' 
    });
  }

  if (user.role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Acceso denegado: el usuario no es un administrador.',
      mensaje: 'Debes tener privilegios de administrador para acceder a este recurso.' 
    });
  }

  next();
};

module.exports = { checkJwt, checkAdmin };