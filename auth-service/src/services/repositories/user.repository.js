const { User } = require('../../models/index.model');

class UserRepository {
  async findByPk(id) {
    return User.findByPk(id);
  }

  async findOne(where) {
    return User.findOne({ where });
  }

  async create(data) {
    return User.create(data);
  }

  async updateById(id, changes) {
    return User.update(changes, { where: { id } });
  }

  async deleteById(id) {
    return User.destroy({ where: { id } });
  }
}

module.exports = new UserRepository();


