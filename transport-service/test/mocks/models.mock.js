const makeModel = () => ({
  findAll: jest.fn().mockResolvedValue([]),
  findByPk: jest.fn().mockResolvedValue(null),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue([1]),
  destroy: jest.fn().mockResolvedValue(1),
});

module.exports = {
  Route: makeModel(),
  Station: makeModel(),
  RouteStation: makeModel(),
  Trip: makeModel(),
  Train: makeModel(),
  Stop: makeModel(),
};


