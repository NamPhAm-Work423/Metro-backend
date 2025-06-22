const axios = require('axios');
const Service = require('../models/Service');
const ServiceInstance = require('../models/ServiceInstance');
const logger = require('../config/logger');

const routingController = {
  // Use service - proxy requests to registered services
  useService: async (req, res, next) => {
    try {
      const { endPoint } = req.params;
      const path = req.params[0] || '';
      const fullPath = path ? `/${path}` : '';

      logger.info('Service routing request', {
        endPoint,
        fullPath,
        method: req.method,
        requestId: req.headers['x-request-id']
      });

      // Find service by endpoint name
      const service = await Service.findOne({
        where: { 
          name: endPoint,
          isActive: true 
        },
        include: [{
          model: ServiceInstance,
          as: 'instances',
          where: { isHealthy: true },
          required: false
        }]
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: `Service '${endPoint}' not found or inactive`,
          error: 'SERVICE_NOT_FOUND',
          requestId: req.headers['x-request-id']
        });
      }

      // Check if service has healthy instances
      if (!service.instances || service.instances.length === 0) {
        return res.status(503).json({
          success: false,
          message: `No healthy instances available for service '${endPoint}'`,
          error: 'NO_HEALTHY_INSTANCES',
          requestId: req.headers['x-request-id']
        });
      }

      // Load balancing - select instance (simple round-robin for now)
      const selectedInstance = routingController.selectInstance(service.instances);
      const targetUrl = `${selectedInstance.instanceUrl}${fullPath}`;

      // Prepare headers
      const headers = {
        ...req.headers,
        'x-request-id': req.headers['x-request-id'],
        'x-forwarded-for': req.ip,
        'x-forwarded-proto': req.protocol,
        'x-forwarded-host': req.get('host')
      };

      // Remove host header to avoid conflicts
      delete headers.host;
      delete headers.authorization; // Remove to avoid conflicts with service auth

      // Prepare request config
      const requestConfig = {
        method: req.method,
        url: targetUrl,
        headers,
        timeout: 30000, // 30 seconds timeout
        maxRedirects: 5
      };

      // Add request body for non-GET requests
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        requestConfig.data = req.body;
      }

      // Add query parameters
      if (Object.keys(req.query).length > 0) {
        requestConfig.params = req.query;
      }

      logger.info('Proxying request to service', {
        targetUrl,
        method: req.method,
        serviceId: service.id,
        instanceId: selectedInstance.id,
        requestId: req.headers['x-request-id']
      });

      // Make request to target service
      const response = await axios(requestConfig);

      // Set response headers
      Object.keys(response.headers).forEach(key => {
        if (!['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) {
          res.set(key, response.headers[key]);
        }
      });

      // Add gateway headers
      res.set('x-gateway-service', service.name);
      res.set('x-gateway-instance', selectedInstance.id);
      res.set('x-request-id', req.headers['x-request-id']);

      logger.info('Service response received', {
        statusCode: response.status,
        targetUrl,
        responseTime: Date.now() - req.startTime + 'ms',
        requestId: req.headers['x-request-id']
      });

      // Send response
      res.status(response.status).send(response.data);

    } catch (error) {
      logger.error('Service routing error', {
        endPoint,
        error: error.message,
        stack: error.stack,
        requestId: req.headers['x-request-id']
      });

      if (error.response) {
        // Service responded with an error
        const statusCode = error.response.status;
        const errorData = error.response.data;

        logger.warn('Service returned error response', {
          statusCode,
          errorData,
          requestId: req.headers['x-request-id']
        });

        res.status(statusCode).json(errorData);
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        // Service is down or unreachable
        logger.error('Service unreachable', {
          endPoint,
          error: error.code,
          requestId: req.headers['x-request-id']
        });

        res.status(503).json({
          success: false,
          message: 'Service temporarily unavailable',
          error: 'SERVICE_UNAVAILABLE',
          requestId: req.headers['x-request-id']
        });
      } else {
        // Other errors
        res.status(500).json({
          success: false,
          message: 'Internal gateway error',
          error: 'GATEWAY_ERROR',
          requestId: req.headers['x-request-id']
        });
      }
    }
  },

  // Simple load balancing - select instance based on weight
  selectInstance: (instances) => {
    if (instances.length === 1) {
      return instances[0];
    }

    // Weighted random selection
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    let random = Math.random() * totalWeight;

    for (const instance of instances) {
      random -= instance.weight;
      if (random <= 0) {
        return instance;
      }
    }

    // Fallback to first instance
    return instances[0];
  },

  // Health check for instances (can be called by scheduled job)
  healthCheckInstance: async (instance) => {
    try {
      const service = await Service.findByPk(instance.serviceId);
      const healthUrl = `${instance.instanceUrl}${service.healthCheckPath}`;

      const response = await axios.get(healthUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      const isHealthy = response.status >= 200 && response.status < 400;
      
      if (instance.isHealthy !== isHealthy) {
        await instance.update({ isHealthy });
        logger.info('Instance health status updated', {
          instanceId: instance.id,
          instanceUrl: instance.instanceUrl,
          isHealthy,
          statusCode: response.status
        });
      }

      return isHealthy;
    } catch (error) {
      logger.warn('Health check failed for instance', {
        instanceId: instance.id,
        instanceUrl: instance.instanceUrl,
        error: error.message
      });

      if (instance.isHealthy) {
        await instance.update({ isHealthy: false });
      }

      return false;
    }
  }
};

module.exports = routingController;
