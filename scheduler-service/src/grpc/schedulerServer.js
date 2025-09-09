const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');
const JobRegistry = require('../services/jobRegistry');
const TicketCronClient = require('../services/ticketClient');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'scheduler.proto');

function loadProto() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
  return grpc.loadPackageDefinition(packageDefinition).scheduler;
}

function createServer() {
  const registry = new JobRegistry({ timezone: process.env.SCHEDULER_TZ || 'Asia/Ho_Chi_Minh' });
  const ticketClient = new TicketCronClient();

  // Example default job: no-op (user will add real handlers)
  registry.registerJob({
    jobId: 'noop',
    cronExpr: process.env.NOOP_CRON || '0 * * * *',
    description: 'No-op job placeholder. Replace with real job handlers.',
    handler: async () => {
      logger.info('noop job executed');
    }
  });

  // Ticket-service cron jobs via gRPC
  if (process.env.TICKET_ACTIVATE_CRON) {
    registry.registerJob({
      jobId: 'ticket-activate-due',
      cronExpr: process.env.TICKET_ACTIVATE_CRON,
      description: 'Activate due long-term tickets',
      handler: async () => {
        const limit = Number(process.env.TICKET_ACTIVATE_LIMIT || '500');
        await ticketClient.activateDueTickets(limit);
      }
    });
  }

  if (process.env.TICKET_EXPIRING_CRON) {
    registry.registerJob({
      jobId: 'ticket-publish-expiring',
      cronExpr: process.env.TICKET_EXPIRING_CRON,
      description: 'Publish expiring-soon tickets',
      handler: async () => {
        const limit = Number(process.env.TICKET_EXPIRING_LIMIT || '1000');
        await ticketClient.publishExpiringSoon(limit);
      }
    });
  }

  const impl = {
    GetStatus: (call, callback) => {
      callback(null, {
        enabled: registry.enabled,
        timezone: registry.timezone,
        jobs: registry.listJobs(),
        timestamp: new Date().toISOString()
      });
    },
    Start: (call, callback) => {
      registry.startAll();
      callback(null, { success: true, message: 'Scheduler started' });
    },
    Stop: (call, callback) => {
      registry.stopAll();
      callback(null, { success: true, message: 'Scheduler stopped' });
    },
    TriggerJob: async (call, callback) => {
      try {
        const { jobId, force } = call.request;
        const result = await registry.runJob(jobId, 'rpc', force);
        if (result.success) {
          callback(null, { success: true, message: 'Job executed', jobId, durationMs: String(result.duration) });
        } else {
          callback(null, { success: false, message: result.message || result.error || 'Failed', jobId, durationMs: String(result.duration || 0) });
        }
      } catch (e) {
        callback({ code: grpc.status.NOT_FOUND, message: e.message });
      }
    },
    UpdateJob: (call, callback) => {
      try {
        const { jobId, cron, enabled } = call.request;
        registry.updateJob(jobId, { cronExpr: cron || undefined, enabled });
        callback(null, { success: true, message: 'Job updated' });
      } catch (e) {
        callback({ code: grpc.status.NOT_FOUND, message: e.message });
      }
    },
    ListJobs: (call, callback) => {
      callback(null, { jobs: registry.listJobs() });
    }
  };

  const schedulerProto = loadProto();
  const server = new grpc.Server();
  server.addService(schedulerProto.SchedulerService.service, impl);

  return { server, registry };
}

function startGrpcServer() {
  const port = process.env.SCHEDULER_GRPC_PORT || '50060';
  const { server, registry } = createServer();

  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      logger.error('Failed to start Scheduler gRPC server', { error: err.message });
      return;
    }
    logger.info(`Scheduler gRPC server running on port ${boundPort}`);
    server.start();
  });

  return { server, registry };
}

module.exports = { startGrpcServer };



