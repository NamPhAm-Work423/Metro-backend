const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

function loadTicketCronProto() {
  const protoPath = path.join(__dirname, '..', 'proto', 'ticketCron.proto');
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  return grpc.loadPackageDefinition(packageDefinition).ticketcron;
}

class TicketCronClient {
  constructor() {
    const host = process.env.TICKET_GRPC_HOST || 'ticket-service';
    const port = process.env.TICKET_GRPC_PORT || '50052';
    this.address = process.env.TICKET_GRPC_URL || `${host}:${port}`;
    const ticketcron = loadTicketCronProto();
    logger.info('TicketCron gRPC Client Configuration', { address: this.address });
    this.client = new ticketcron.TicketCronService(this.address, grpc.credentials.createInsecure());
  }

  activateDueTickets(limit = 500) {
    return new Promise((resolve, reject) => {
      this.client.ActivateDueTickets({ limit }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }

  publishExpiringSoon(limit = 1000) {
    return new Promise((resolve, reject) => {
      this.client.PublishExpiringSoon({ limit }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });
  }
}

module.exports = TicketCronClient;


