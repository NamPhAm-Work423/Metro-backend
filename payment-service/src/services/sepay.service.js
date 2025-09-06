const { Payment, Transaction, PaymentLog } = require('../models/index.model');
const { logger } = require('../config/logger');

class SepayService {

    static async createQr({ paymentId, ticketId, passengerId, amountVnd, orderDescription }) {
      const bankBin = process.env.SEPAY_BANK_BIN;
      const accountNo = process.env.SEPAY_ACCOUNT_NO;
  
      await Payment.create({
        paymentId,
        ticketId,
        passengerId,
        paymentAmount: amountVnd,
        paymentMethod: 'sepay',
        paymentStatus: 'PENDING',
        paymentDate: null,
        currency: 'VND',
        description: paymentId, 
        paymentGatewayResponse: null
      });
  
      await PaymentLog.create({
        paymentId,
        paymentLogType: 'PAYMENT',
        paymentLogStatus: 'PENDING',
        paymentLogDate: new Date()
      });
  
      // 2) Build URL ảnh QR theo hướng dẫn SePay (đơn giản, không cần SDK)
      const params = new URLSearchParams({
        bank: bankBin,
        acc: accountNo,
        amount: String(amountVnd),
        des: orderDescription || paymentId
      });
      const qrImageUrl = `https://qr.sepay.vn/img?${params.toString()}`;
  
      return {
        paymentId,
        provider: 'sepay',
        amount: amountVnd,
        currency: 'VND',
        qrImage: qrImageUrl
      };
    }
  
    /**
     * Xử lý webhook từ SePay: đánh dấu COMPLETED + tạo Transaction
     * payload mẫu: { transaction_id, amount, description, status, ... }
     */
    static async handleWebhook(payload) {
      // 0) (Tùy chọn) verify chữ ký/timestamp theo header của SePay nếu có
      // if (!this.verifySignature(req)) throw new Error('Invalid signature');
  
      if (!payload || payload.status !== 'completed') return { ok: true };
  
      // Ta quyết định description = paymentId khi tạo QR
      const paymentId = (payload.description || '').trim();
      if (!paymentId) return { ok: true };
  
      const payment = await Payment.findByPk(paymentId);
      if (!payment) return { ok: true };
  
      // Idempotent: nếu đã COMPLETED thì bỏ qua
      if (payment.paymentStatus === 'COMPLETED') return { ok: true };
  
      // 1) Cập nhật payment
      await Payment.update(
        {
          paymentStatus: 'COMPLETED',
          paymentDate: new Date(),
          providerRef: payload.transaction_id,
          paymentGatewayResponse: payload
        },
        { where: { paymentId } }
      );
  
      // 2) Ghi transaction (COMPLETED)
      await Transaction.create({
        paymentId,
        transactionAmount: payload.amount,
        transactionStatus: 'COMPLETED'
      });
  
      // 3) Log webhook
      await PaymentLog.create({
        paymentId,
        paymentLogType: 'WEBHOOK',
        paymentLogStatus: 'COMPLETED',
        paymentLogDate: new Date()
      });
  
      // 4) (Tùy chọn) publish Kafka event để ticket-service active vé
      return { ok: true };
    }
  }
  
module.exports = SepayService;