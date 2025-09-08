const { Payment, Transaction, PaymentLog } = require('../models/index.model');
const { logger } = require('../config/logger');
const { Sequelize } = require('sequelize');

class SepayService {
  static _assertEnv() {
    const missing = [];
    if (!process.env.SEPAY_BANK) missing.push('SEPAY_BANK');
    if (!process.env.SEPAY_ACCOUNT_NO) missing.push('SEPAY_ACCOUNT_NO');
    if (missing.length) {
      const msg = `Missing env: ${missing.join(', ')}`;
      logger.error(msg);
      throw new Error(msg);
    }
  }

  /**
   * Tạo payment PENDING + trả URL QR SePay để FE render.
   */
  static async createQr({ paymentId, ticketId, passengerId, amountVnd, orderDescription }) {
    this._assertEnv();
    const bankName = process.env.SEPAY_BANK;
    const accountNo = process.env.SEPAY_ACCOUNT_NO;

    if (!paymentId || !ticketId || !passengerId || !amountVnd) {
      throw new Error('Missing required fields: paymentId, ticketId, passengerId, amountVnd');
    }

    const trx = await Payment.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
      await Payment.create({
        paymentId,
        ticketId,
        passengerId,
        paymentAmount: amountVnd,
        paymentMethod: 'sepay',
        paymentStatus: 'PENDING',
        paymentDate: new Date(),
        currency: 'VND',
        description: orderDescription || paymentId,
        paymentGatewayResponse: null
      }, { transaction: trx });

      await PaymentLog.create({
        paymentId,
        paymentLogType: 'PAYMENT',
        paymentLogStatus: 'PENDING',
        paymentLogDate: new Date()
      }, { transaction: trx });

      await trx.commit();

      const params = new URLSearchParams({
        bank: bankName,
        acc: accountNo,
        amount: String(amountVnd),
        des: orderDescription || paymentId
      });
      const qrImageUrl = `https://qr.sepay.vn/img?${params.toString()}`;

      logger.info('SePay QR created', { paymentId, ticketId, amountVnd, bankName });
      return {
        paymentId,
        provider: 'sepay',
        amount: amountVnd,
        currency: 'VND',
        qrImage: qrImageUrl
      };
    } catch (err) {
      await trx.rollback();
      logger.error('Create SePay QR failed', { paymentId, error: err.message });
      throw err;
    }
  }

  /**
   * Xử lý webhook từ SePay: completed -> cập nhật Payment, tạo Transaction, log WEBHOOK.
   * payload mẫu: { transaction_id, amount, description, status, ... }
   */
  static async handleWebhook(payload) {
    try {
      if (!payload) return { ok: true };
      if (payload.status !== 'completed') return { ok: true };

      const paymentId = (payload.description || '').trim();
      if (!paymentId) return { ok: true };

      const payment = await Payment.findByPk(paymentId);
      if (!payment) return { ok: true };

      if (payment.paymentStatus === 'COMPLETED') return { ok: true };

      if (Number(payment.paymentAmount) !== Number(payload.amount)) {
        logger.warn('SePay webhook amount mismatch', {
          paymentId,
          expected: String(payment.paymentAmount),
          actual: String(payload.amount)
        });
        return { ok: true };
      }

      const trx = await Payment.sequelize.transaction();
      try {
        await Payment.update({
          paymentStatus: 'COMPLETED',
          paymentDate: new Date(),
          paymentGatewayResponse: payload
        }, { where: { paymentId }, transaction: trx });

        await Transaction.create({
          paymentId,
          transactionAmount: payload.amount,
          transactionStatus: 'COMPLETED'
        }, { transaction: trx });

        await PaymentLog.create({
          paymentId,
          paymentLogType: 'WEBHOOK',
          paymentLogStatus: 'COMPLETED',
          paymentLogDate: new Date()
        }, { transaction: trx });

        await trx.commit();
        logger.info('SePay payment completed', { paymentId, amount: payload.amount });
      } catch (err) {
        await trx.rollback();
        logger.error('SePay webhook DB error', { paymentId, error: err.message });
        throw err;
      }

      return { ok: true };
    } catch (err) {
      logger.error('SePay webhook handler failed', { error: err.message });
      throw err;
    }
  }
}

module.exports = SepayService;