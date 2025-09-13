// Silence DB connect retry logs and avoid real connections during tests
jest.mock('../src/config/database', () => {
  const mockSequelize = {
    define: jest.fn().mockReturnValue({
      belongsTo: jest.fn(),
      hasMany: jest.fn(),
      hasOne: jest.fn(),
      belongsToMany: jest.fn(),
      sync: jest.fn().mockResolvedValue(),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue([1]),
      destroy: jest.fn().mockResolvedValue(1),
      count: jest.fn().mockResolvedValue(0),
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
      bulkCreate: jest.fn().mockResolvedValue([]),
      bulkUpdate: jest.fn().mockResolvedValue([1]),
      bulkDestroy: jest.fn().mockResolvedValue(1),
      // Add prototype methods for model instances
      prototype: {
        save: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        destroy: jest.fn().mockResolvedValue(),
        reload: jest.fn().mockResolvedValue({}),
        toJSON: jest.fn().mockReturnValue({})
      }
    }),
    sync: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    authenticate: jest.fn().mockResolvedValue(),
    transaction: jest.fn().mockImplementation((callback) => callback({})),
    fn: jest.fn(),
    col: jest.fn(),
    literal: jest.fn(),
    and: jest.fn(),
    or: jest.fn(),
    Op: {
      eq: Symbol('eq'),
      ne: Symbol('ne'),
      gte: Symbol('gte'),
      gt: Symbol('gt'),
      lte: Symbol('lte'),
      lt: Symbol('lt'),
      not: Symbol('not'),
      is: Symbol('is'),
      in: Symbol('in'),
      notIn: Symbol('notIn'),
      like: Symbol('like'),
      notLike: Symbol('notLike'),
      iLike: Symbol('iLike'),
      notILike: Symbol('notILike'),
      regexp: Symbol('regexp'),
      notRegexp: Symbol('notRegexp'),
      iRegexp: Symbol('iRegexp'),
      notIRegexp: Symbol('notIRegexp'),
      between: Symbol('between'),
      notBetween: Symbol('notBetween'),
      overlap: Symbol('overlap'),
      contains: Symbol('contains'),
      contained: Symbol('contained'),
      adjacent: Symbol('adjacent'),
      strictLeft: Symbol('strictLeft'),
      strictRight: Symbol('strictRight'),
      noExtendLeft: Symbol('noExtendLeft'),
      noExtendRight: Symbol('noExtendRight'),
      and: Symbol('and'),
      or: Symbol('or'),
      any: Symbol('any'),
      all: Symbol('all'),
      values: Symbol('values'),
      col: Symbol('col'),
      placeholder: Symbol('placeholder'),
      join: Symbol('join')
    }
  };
  
  return mockSequelize;
});

// Mock models to prevent import issues
jest.mock('../src/models', () => ({
  Email: {
    create: jest.fn().mockResolvedValue({}),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue([1]),
    destroy: jest.fn().mockResolvedValue(1),
    count: jest.fn().mockResolvedValue(0),
    findByRecipient: jest.fn().mockResolvedValue([]),
    findByStatus: jest.fn().mockResolvedValue([]),
    findByCategory: jest.fn().mockResolvedValue([]),
    findByProvider: jest.fn().mockResolvedValue([]),
    getStats: jest.fn().mockResolvedValue({ total: 0, successRate: 0, byStatus: [], byProvider: [], byCategory: [] })
  },
  SMS: {
    create: jest.fn().mockResolvedValue({}),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue([1]),
    destroy: jest.fn().mockResolvedValue(1),
    count: jest.fn().mockResolvedValue(0)
  },
  sequelize: {
    define: jest.fn().mockReturnValue({}),
    sync: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    authenticate: jest.fn().mockResolvedValue()
  }
}));

// Mock gRPC clients
jest.mock('../src/grpc/ticket.client', () => ({
  initialize: jest.fn().mockResolvedValue(),
  close: jest.fn().mockResolvedValue(),
  getTicketsByRoutes: jest.fn().mockResolvedValue({ tickets: [], totalCount: 0 }),
  ticketContainsRoutes: jest.fn().mockImplementation((fareBreakdown, routeIds) => {
    if (!fareBreakdown || !routeIds) return false;
    // Check segmentFares
    if (fareBreakdown.segmentFares) {
      return fareBreakdown.segmentFares.some(segment => routeIds.includes(segment.routeId));
    }
    // Check journeyDetails.routeSegments
    if (fareBreakdown.journeyDetails?.routeSegments) {
      return fareBreakdown.journeyDetails.routeSegments.some(segment => routeIds.includes(segment.routeId));
    }
    return false;
  }),
  extractUniquePassengerIds: jest.fn().mockImplementation((tickets) => {
    if (!tickets || !Array.isArray(tickets)) return [];
    const passengerIds = tickets
      .map(ticket => ticket.passengerId)
      .filter(id => id != null);
    return [...new Set(passengerIds)];
  })
}));

jest.mock('../src/grpc/user.client', () => ({
  initialize: jest.fn().mockResolvedValue(),
  close: jest.fn().mockResolvedValue(),
  getPassengerPhoneNumbers: jest.fn().mockResolvedValue({ contacts: [] }),
  getPassengerEmails: jest.fn().mockResolvedValue({ passengers: [] }),
  filterSmsEnabledContacts: jest.fn().mockImplementation((contacts) => {
    if (!contacts || !Array.isArray(contacts)) return [];
    return contacts.filter(contact => contact.smsEnabled === true);
  }),
  convertContactsToUsers: jest.fn().mockImplementation((contacts) => {
    if (!contacts || !Array.isArray(contacts)) return [];
    return contacts.map(contact => ({
      passengerId: contact.passengerId,
      phoneNumber: contact.phoneNumber,
      name: contact.name || 'Unknown'
    }));
  }),
  filterEmailEnabledPassengers: jest.fn().mockImplementation((passengers) => {
    if (!passengers || !Array.isArray(passengers)) return [];
    return passengers.filter(passenger => passenger.emailEnabled === true && passenger.email);
  }),
  convertPassengersToUsers: jest.fn().mockImplementation((passengers) => {
    if (!passengers || !Array.isArray(passengers)) return [];
    return passengers.map(passenger => ({
      userId: passenger.passengerId,
      email: passenger.email,
      name: passenger.name || 'Unknown'
    }));
  })
}));

// Mock template service
jest.mock('../src/services/template.service', () => {
  const mockTemplateService = jest.fn().mockImplementation((baseDir = '/base') => {
    const instance = {
      baseDir,
      renderTemplate: jest.fn().mockImplementation(async (templatePath, data) => {
        if (templatePath.includes('station_deactivation')) {
          return `🚨 THÔNG BÁO TẠM NGỪNG GA\nGa: ${data.stationName}`;
        }
        return 'Mock template content';
      }),
      render: jest.fn().mockImplementation(async (templatePath, data) => {
        if (templatePath.includes('station_deactivation')) {
          return `🚨 THÔNG BÁO TẠM NGỪNG GA\nGa: ${data.stationName}`;
        }
        if (templatePath.includes('{{name}}')) {
          return `Hello ${data.name}`;
        }
        return 'Mock rendered content';
      }),
      resolve: jest.fn().mockImplementation((path) => `${baseDir}/${path}`),
      loadTemplate: jest.fn().mockImplementation((templatePath) => {
        if (templatePath.includes('missing')) {
          throw new Error('Template not found');
        }
        return jest.fn().mockReturnValue('Mock compiled template');
      })
    };
    return instance;
  });
  
  return mockTemplateService;
});

// Mock logger to prevent console output during tests
jest.mock('../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));



