# Payment Integration - Phương án 2: Kafka Event-driven

## Tổng quan

Phương án 2 sử dụng Kafka event-driven architecture để tạo ticket và xử lý payment một cách asynchronous. Khi tạo ticket, hệ thống sẽ:

1. Tạo ticket với status `pending_payment`
2. Publish Kafka event `ticket.created` đến payment service
3. Payment service xử lý và tạo payment URL
4. Payment service publish event `ticket.payment_ready` với payment URL
5. Ticket service cập nhật ticket với payment URL
6. Trả về payment URL cho FE

## Luồng hoạt động

### 1. Tạo Ticket

```javascript
// POST /v1/tickets/create-short-term
{
  "fromStation": "station_001",
  "toStation": "station_005", 
  "tripType": "Oneway",
  "numAdults": 1,
  "paymentMethod": "vnpay" // hoặc "paypal"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Ticket created and payment URL generated successfully",
  "data": {
    "ticket": {
      "ticketId": "TKT_SHT_123_PAY_1234567890",
      "status": "pending_payment",
      "totalPrice": 25000,
      // ... other ticket data
    },
    "payment": {
      "paymentId": "TKT_SHT_123_PAY_1234567890",
      "paymentUrl": "https://sandbox.vnpayment.vn/payment/v2/transaction.html?vnp_Amount=2500000&vnp_Command=pay&vnp_CreateDate=20231201120000&vnp_CurrCode=VND&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Metro%20ticket%20short-term%20-%20TKT_SHT_123&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A3000%2Fv1%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=TMNO&vnp_TxnRef=TKT_SHT_123_PAY_1234567890&vnp_Version=2.1.0&vnp_SecureHash=abc123",
      "paymentMethod": "vnpay",
      "status": "ready"
    }
  }
}
```

### 2. Check Payment Status

Nếu payment URL chưa sẵn sàng ngay lập tức, FE có thể check status:

```javascript
// GET /v1/tickets/payment-status/TKT_SHT_123_PAY_1234567890
```

**Response:**
```javascript
{
  "success": true,
  "message": "Payment URL is ready",
  "data": {
    "paymentId": "TKT_SHT_123_PAY_1234567890",
    "paymentUrl": "https://sandbox.vnpayment.vn/payment/v2/transaction.html?...",
    "paymentMethod": "vnpay",
    "status": "ready"
  }
}
```

## Kafka Events

### 1. Ticket Created Event
```javascript
// Topic: ticket.created
{
  "ticketId": "TKT_SHT_123",
  "paymentId": "TKT_SHT_123_PAY_1234567890",
  "passengerId": "PASS_001",
  "amount": 25000,
  "ticketType": "short-term",
  "ticketData": {
    "originStationId": "station_001",
    "destinationStationId": "station_005",
    "paymentMethod": "vnpay"
  },
  "status": "PENDING_PAYMENT"
}
```

### 2. Payment Ready Event
```javascript
// Topic: ticket.payment_ready
{
  "ticketId": "TKT_SHT_123",
  "paymentId": "TKT_SHT_123_PAY_1234567890",
  "paymentUrl": "https://sandbox.vnpayment.vn/payment/v2/transaction.html?...",
  "paymentMethod": "vnpay",
  "status": "PAYMENT_READY"
}
```

## Cấu hình

### Environment Variables

```bash
# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ticket-service

# Payment Service URLs
PAYMENT_SERVICE_URL=http://localhost:3004
API_GATEWAY_URL=http://localhost:3000
```

### Database Schema Updates

Ticket model cần thêm các fields:
- `paymentUrl`: URL để redirect đến payment gateway
- `paypalOrderId`: PayPal order ID (nếu dùng PayPal)
- `status`: `pending_payment` → `active` (sau khi payment thành công)

## Error Handling

### Timeout Scenarios
- Nếu payment service không respond trong 30 giây, ticket service sẽ trả về status "processing"
- FE có thể poll `/payment-status/:paymentId` để check status

### Payment Failed
- Payment service sẽ publish `payment.failed` event
- Ticket service có thể handle để update ticket status

## Ưu điểm của Phương án 2

1. **Event-driven Architecture**: Tận dụng Kafka để decouple services
2. **Scalability**: Có thể handle nhiều payment methods dễ dàng
3. **Reliability**: Có retry mechanism và error handling
4. **Consistency**: Đảm bảo data consistency giữa ticket và payment
5. **Monitoring**: Có thể track payment flow qua Kafka events

## So sánh với Phương án 1

| Aspect | Phương án 1 | Phương án 2 |
|--------|-------------|-------------|
| Complexity | Đơn giản | Phức tạp hơn |
| Scalability | Hạn chế | Tốt |
| Error Handling | Basic | Advanced |
| Monitoring | Limited | Comprehensive |
| Payment Methods | Manual integration | Easy extension |

## Implementation Notes

1. **Timeout Configuration**: Có thể điều chỉnh timeout trong `waitForPaymentResponse()`
2. **Payment Methods**: Dễ dàng thêm payment methods mới trong payment service
3. **Retry Logic**: Có thể implement retry logic cho failed payments
4. **Monitoring**: Sử dụng Kafka events để monitor payment flow 