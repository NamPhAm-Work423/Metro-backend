const makeModel = () => ({
  findAll: jest.fn().mockResolvedValue([]),
  findByPk: jest.fn().mockResolvedValue(null),
  findOne: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue([1]),
  destroy: jest.fn().mockResolvedValue(1),
});

module.exports = {
  sequelize: {},
  Admin: makeModel(),
  Passenger: makeModel(),
  Staff: makeModel(),
};


