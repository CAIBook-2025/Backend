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
  usersService: {
    findOrCreateUser: jest.fn().mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User'
    })
  }
}));

process.env.NODE_ENV = 'test';

// Mock del middleware de autenticación PRIMERO
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

// Mock de la base de datos para evitar errores de conexión en los tests
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    // Mock de todos los modelos principales
    publicSpace: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        if (args?.where?.id) {
          return Promise.resolve({ 
            id: args.where.id, 
            name: 'Espacio Test', 
            capacity: 100,
            availability: 'AVAILABLE'
          });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0)
    },
    group: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        if (args?.where?.id) {
          return Promise.resolve({ id: args.where.id, name: 'Test Group' });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({})
    },
    attendance: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        if (args?.where?.id) {
          return Promise.resolve({ id: args.where.id, student_id: 1, event_id: 1, rating: 5 });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({})
    },
    eventsScheduling: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        if (args?.where?.id) {
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
        if (args?.where?.id) {
          return Promise.resolve({ id: args.where.id, name: 'Test Event Request' });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
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
        if (args?.where?.id) {
          return Promise.resolve({ 
            id: args.where.id, 
            userId: 1, 
            srId: 1, 
            startsAt: new Date(), 
            endsAt: new Date(), 
            status: 'CONFIRMED' 
          });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(1)
    },
    strike: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn((args) => {
        if (args?.where?.id) {
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
        if (args?.where?.id) {
          return Promise.resolve({ id: args.where.id, name: 'Test Room' });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0)
    },
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', auth0Id: 'test-user-id' }
      ]),
      findUnique: jest.fn((args) => {
        if (args?.where?.id) {
          return Promise.resolve({ 
            id: args.where.id, 
            first_name: 'Test', 
            last_name: 'User', 
            email: 'test@example.com',
            auth0Id: 'test-user-id'
          });
        }
        if (args?.where?.auth0Id) {
          return Promise.resolve({ 
            id: 1, 
            first_name: 'Test', 
            last_name: 'User', 
            email: 'test@example.com',
            auth0Id: args.where.auth0Id
          });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn((args) => Promise.resolve({ id: 1, ...args.data })),
      update: jest.fn((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(1)
    }
  }
}));