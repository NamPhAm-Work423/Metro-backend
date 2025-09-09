const express = require('express');
const { logger } = require('../config/logger');

function createHealthServer(registryProvider) {
  const app = express();

  app.get('/health', (req, res) => {
    try {
      const registry = registryProvider?.();
      const status = {
        service: 'scheduler-service',
        healthy: true,
        schedulerEnabled: registry ? registry.enabled : undefined,
        jobs: registry ? registry.listJobs() : [],
        timestamp: new Date().toISOString()
      };
      res.json(status);
    } catch (e) {
      logger.error('Health endpoint error', { error: e.message });
      res.status(500).json({ healthy: false, error: e.message });
    }
  });

  return app;
}

module.exports = { createHealthServer };


