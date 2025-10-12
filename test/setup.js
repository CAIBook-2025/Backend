process.env.NODE_ENV = 'test';

// Mock del middleware de autenticación
jest.mock('../src/middleware/auth', () => ({
  checkJwt: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Mock exitoso - simula usuario autenticado
      req.auth = { sub: 'test-user-id', email: 'test@example.com' };
      next();
    } else {
      res.status(401).json({ error: 'No autorizado' });
    }
  }
}));

// Mock del servicio de usuarios
jest.mock('../src/users/usersService', () => ({
  findOrCreateUser: jest.fn().mockResolvedValue({
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    auth0_id: 'test-user-id'
  }),
  createUser: jest.fn((userData) => Promise.resolve({ id: 1, ...userData }))
}));

// Mock de la base de datos para evitar errores de conexión en los tests
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    // Mock de todos los modelos principales
    publicSpace: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        // Solo devolver datos para IDs válidos (menores a 1000)
        if (args?.where?.id && args.where.id < 1000) {
          return Promise.resolve({ 
            id: args.where.id, 
            name: 'Espacio Test', 
            capacity: 100,
            availability: 'AVAILABLE'
          });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => {
        // Solo validar name como obligatorio
        if (!args?.data?.name) {
          throw new Error('Missing required fields');
        }
        return Promise.resolve({ id: 1, ...args.data });
      }),
      update: jest.fn((args) => {
        // Solo actualizar IDs válidos
        if (args?.where?.id && args.where.id >= 1000) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ id: args.where.id, ...args.data });
      }),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0)
    },
    group: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        // Solo devolver datos para IDs válidos (positivos y menores a 1000)
        if (args?.where?.id && args.where.id > 0 && args.where.id < 1000) {
          return Promise.resolve({ id: args.where.id, name: 'Test Group' });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => {
        // Solo validar name como obligatorio
        if (!args?.data?.name) {
          throw new Error('Missing required fields');
        }
        return Promise.resolve({ id: 1, ...args.data });
      }),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({})
    },
    attendance: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        // Solo devolver datos para IDs válidos
        if (args?.where?.id && args.where.id < 1000) {
          return Promise.resolve({ id: args.where.id, student_id: 1, event_id: 1, rating: 5 });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
      update: jest.fn((args) => {
        // Solo actualizar IDs válidos
        if (args?.where?.id && args.where.id >= 1000) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ id: args.where.id, ...args.data });
      }),
      delete: jest.fn().mockResolvedValue({})
    },
    eventsScheduling: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        // Solo devolver datos para IDs válidos
        if (args?.where?.id && args.where.id < 1000) {
          return Promise.resolve({ id: args.where.id, title: 'Test Event' });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({})
    },
    eventRequest: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        if (args?.where?.id && args.where.id < 1000) {
          return Promise.resolve({ id: args.where.id, name: 'Test Event Request' });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => {
        // Solo validar name como obligatorio
        if (!args?.data?.name) {
          throw new Error('Missing required fields');
        }
        return Promise.resolve({ id: 1, ...args.data });
      }),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({})
    },
    groupRequest: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        if (args?.where?.id) {
          return Promise.resolve({ id: args.where.id, name: 'Test Group Request' });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({})
    },
    sRScheduling: {
      findMany: jest.fn().mockResolvedValue([]), // No conflicts by default
      findUnique: jest.fn((args) => {
        if (args?.where?.id && args.where.id < 1000) {
          return Promise.resolve({ 
            id: args.where.id, 
            sr_id: 1,
            day: 'MONDAY',
            module: 1,
            available: 'AVAILABLE',
            user_id: null
          });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => {
        // Validar campos requeridos para sRScheduling (schedule routes)
        if (!args?.data?.sr_id && !args?.data?.srId) {
          throw new Error('Missing required fields');
        }
        return Promise.resolve({ 
          id: 1, 
          sr_id: args.data.sr_id || args.data.srId, 
          ...args.data 
        });
      }),
      update: jest.fn((args) => {
        if (args?.where?.id && args.where.id >= 1000) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ id: args.where.id, ...args.data });
      }),
      updateMany: jest.fn((args) => {
        // Simular actualización exitosa si el ID es válido y está disponible
        if (args?.where?.id && args.where.id < 1000) {
          return Promise.resolve({ count: 1 });
        }
        return Promise.resolve({ count: 0 });
      }),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(1)
    },
    strike: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        // Solo devolver datos para IDs válidos
        if (args?.where?.id && args.where.id < 1000) {
          return Promise.resolve({ id: args.where.id, user_id: 1, severity: 'medium' });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({})
    },
    studyRoom: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        // Solo devolver datos para IDs válidos (positivos y menores a 1000)
        if (args?.where?.id && args.where.id > 0 && args.where.id < 1000) {
          return Promise.resolve({ id: args.where.id, name: 'Test Room' });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
      update: jest.fn((args) => {
        // Solo actualizar IDs válidos
        if (args?.where?.id && (args.where.id <= 0 || args.where.id >= 1000)) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ id: args.where.id, ...args.data });
      }),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0)
    },
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', auth0_id: 'test-user-id' }
      ]),
      findUnique: jest.fn((args) => {
        // Manejar IDs inválidos o no numéricos
        if (args?.where?.id) {
          if (typeof args.where.id === 'string' && isNaN(parseInt(args.where.id))) {
            return Promise.resolve(null);
          }
          if (args.where.id < 1000) {
            return Promise.resolve({ 
              id: args.where.id, 
              first_name: 'Test', 
              last_name: 'User', 
              email: 'test@example.com',
              auth0_id: 'test-user-id'
            });
          }
          return Promise.resolve(null);
        }
        if (args?.where?.auth0_id) {
          return Promise.resolve({ 
            id: 1, 
            first_name: 'Test', 
            last_name: 'User', 
            email: 'test@example.com',
            auth0_id: args.where.auth0_id
          });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => {
        // Validar campos requeridos
        if (!args?.data?.first_name || !args?.data?.last_name || !args?.data?.email) {
          throw new Error('Missing required fields');
        }
        return Promise.resolve({ id: 1, ...args.data });
      }),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(1)
    }
  }
}));