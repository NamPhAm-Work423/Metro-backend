// In-memory mock models for unit tests
const payments = [];
const paymentLogs = [];
const transactions = [];

class Payment {
  constructor(data) {
    Object.assign(this, data);
    this.paymentId = this.paymentId || `${Date.now()}-${Math.floor(Math.random()*1000)}`;
    this.paymentDate = this.paymentDate || new Date();
    this.updatedAt = this.paymentDate;
  }

  static async create(data) {
    const instance = new Payment(data);
    payments.push(instance);
    return instance;
  }

  static async findOne({ where, order } = {}) {
    let list = payments;
    if (where) {
      list = list.filter(p => Object.entries(where).every(([k, v]) => p[k] === v));
    }
    if (order && order.length) {
      const [field, dir] = order[0];
      list = list.sort((a, b) => dir === 'DESC' ? (b[field] - a[field]) : (a[field] - b[field]));
    }
    return list[0] || null;
  }

  async save() {
    this.updatedAt = new Date();
    return this;
  }
}

class PaymentLog {
  static async create(data) {
    paymentLogs.push({ ...data });
    return data;
  }
}

class Transaction {
  static async create(data) {
    transactions.push({ ...data });
    return data;
  }
}

module.exports = { Payment, PaymentLog, Transaction };


