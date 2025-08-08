const { Key } = require('../../models/index.model');

class KeyRepository {
  async findActiveByHashedValue(hashedValue) {
    return Key.findOne({ where: { value: hashedValue, status: 'activated' } });
  }

  async findActiveByUserId(userId) {
    return Key.findAll({ where: { userId, status: 'activated' } });
  }

  async findLatestActiveByUserId(userId) {
    return Key.findOne({
      where: { userId, status: 'activated' },
      order: [['createdAt', 'DESC']]
    });
  }

  async createKey(userId, hashedValue) {
    return Key.create({ value: hashedValue, userId, status: 'activated', lastUsedAt: new Date() });
  }

  async updateLastUsedAt(keyId, when = new Date()) {
    await Key.update({ lastUsedAt: when }, { where: { id: keyId } });
  }

  async updateValueAndLastUsed(keyId, hashedValue, when = new Date()) {
    await Key.update({ value: hashedValue, lastUsedAt: when }, { where: { id: keyId } });
  }

  async expireAllByUserId(userId) {
    const [count] = await Key.update({ status: 'expired' }, { where: { userId, status: 'activated' } });
    return count;
  }

  async deleteById(keyId) {
    return Key.destroy({ where: { id: keyId } });
  }
}

module.exports = new KeyRepository();
