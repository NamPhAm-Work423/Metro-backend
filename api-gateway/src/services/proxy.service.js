const axios = require('axios');
const logger = require('../config/logger');
const serviceModel = require('../models/service.model');
const loadBalancerService = require('./loadBalancer.service');
const errorHandlerService = require('./errorHandler.service');

class ProxyService {
  constructor() {
    this.defaultTimeout = 30000;
    this.maxRetries = 3;
  }

  /**
   * Proxy request to microservice
   */
  async proxyRequest(req, res, serviceName) {
    const startTime = Date.now();
    let selectedInstance = null;
    
    try {
      // Get service configuration
      const service = serviceModel.getService(serviceName);
      if (!service) {
        throw errorHandlerService.notFoundError(`Service ${serviceName}`, req.correlationId);
      }

      // Check if authentication is required
      if (service.authentication.required && !req.user) {
        throw errorHandlerService.authenticationError('Authentication required for this service', req.correlationId);
      }

      // Check user roles if specified
      if (service.authentication.roles.length > 0 && req.user) {
        const hasRequiredRole = service.authentication.roles.some(role => req.user.roles.includes(role));
        if (!hasRequiredRole) {
          throw errorHandlerService.authorizationError('Insufficient permissions for this service', req.correlationId);
        }
      }

      // Get healthy instance using load balancer
      selectedInstance = await loadBalancerService.getHealthyInstanceWithFallback(serviceName, req);
      
      // Increment connection count
      await loadBalancerService.incrementConnections(serviceName, selectedInstance.id);

      // Build target URL
      const targetUrl = this.buildTargetUrl(selectedInstance, req.originalUrl, service.path);
      
      // Prepare request options
      const requestOptions = this.buildRequestOptions(req, service, targetUrl);

      // Make request with retry logic
      const response = await this.makeRequestWithRetry(requestOptions, service.retries);
      
      // Record success
      const responseTime = Date.now() - startTime;
      await serviceModel.recordSuccess(serviceName, selectedInstance.id, responseTime);

      // Forward response
      this.forwardResponse(res, response);

      logger.info('Proxy request successful', {
        serviceName,
        instanceId: selectedInstance.id,
        method: req.method,
        path: req.originalUrl,
        statusCode: response.status,
        responseTime,
        correlationId: req.correlationId
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Record failure if instance was selected
      if (selectedInstance) {
        await serviceModel.recordFailure(serviceName, selectedInstance.id, error);
        await loadBalancerService.decrementConnections(serviceName, selectedInstance.id);
      }

      logger.error('Proxy request failed', {
        serviceName,
        instanceId: selectedInstance?.id,
        method: req.method,
        path: req.originalUrl,
        error: error.message,
        responseTime,
        correlationId: req.correlationId
      });

      // Handle error and send response
      this.handleProxyError(error, req, res);
    } finally {
      // Decrement connection count
      if (selectedInstance) {
        await loadBalancerService.decrementConnections(serviceName, selectedInstance.id);
      }
    }
  }

  /**
   * Build target URL for the request
   */
  buildTargetUrl(instance, originalUrl, servicePath) {
    const baseUrl = `http://${instance.host}:${instance.port}`;
    
    // Remove service path from original URL
    let targetPath = originalUrl;
    if (servicePath && originalUrl.startsWith(servicePath)) {
      targetPath = originalUrl.substring(servicePath.length);
    }
    
    // Ensure path starts with /
    if (!targetPath.startsWith('/')) {
      targetPath = '/' + targetPath;
    }
    
    return baseUrl + targetPath;
  }

  /**
   * Build request options for axios
   */
  buildRequestOptions(req, service, targetUrl) {
    const options = {
      method: req.method,
      url: targetUrl,
      timeout: service.timeout || this.defaultTimeout,
      headers: this.prepareHeaders(req),
      validateStatus: () => true, // Don't throw on HTTP error status codes
      maxRedirects: 5
    };

    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase()) && req.body) {
      options.data = req.body;
    }

    // Add query parameters
    if (req.query && Object.keys(req.query).length > 0) {
      options.params = req.query;
    }

    return options;
  }

  /**
   * Prepare headers for forwarding
   */
  prepareHeaders(req) {
    const headers = { ...req.headers };
    
    // Remove hop-by-hop headers
    delete headers.connection;
    delete headers['keep-alive'];
    delete headers['proxy-authenticate'];
    delete headers['proxy-authorization'];
    delete headers.te;
    delete headers.trailers;
    delete headers.upgrade;
    delete headers.host;

    // Add/update forwarding headers
    headers['x-forwarded-for'] = req.ip;
    headers['x-forwarded-proto'] = req.protocol;
    headers['x-forwarded-host'] = req.get('host');
    
    // Keep correlation and request IDs
    if (req.correlationId) {
      headers['x-correlation-id'] = req.correlationId;
    }
    if (req.requestId) {
      headers['x-request-id'] = req.requestId;
    }

    // Add user context if authenticated
    if (req.user) {
      headers['x-user-id'] = req.user.id.toString();
      headers['x-user-email'] = req.user.email;
      headers['x-user-roles'] = JSON.stringify(req.user.roles);
    }

    return headers;
  }

  /**
   * Make request with retry logic
   */
  async makeRequestWithRetry(options, maxRetries = this.maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios(options);
        
        // Check if response is successful or client error (don't retry)
        if (response.status < 500) {
          return response;
        }
        
        // Server error - might be worth retrying
        lastError = new Error(`Server error: ${response.status}`);
        lastError.response = response;
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }
      }
      
      // Don't wait after last attempt
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error should not be retried
   */
  shouldNotRetry(error) {
    // Don't retry on client errors (4xx)
    if (error.response && error.response.status < 500) {
      return true;
    }
    
    // Don't retry on timeout errors (might indicate slow service)
    if (error.code === 'ETIMEDOUT') {
      return true;
    }
    
    return false;
  }

  /**
   * Forward response to client
   */
  forwardResponse(res, response) {
    // Set status code
    res.status(response.status);
    
    // Forward headers (except hop-by-hop headers)
    Object.entries(response.headers).forEach(([key, value]) => {
      if (!this.isHopByHopHeader(key)) {
        res.set(key, value);
      }
    });
    
    // Send response body
    if (response.data) {
      res.send(response.data);
    } else {
      res.end();
    }
  }

  /**
   * Check if header is hop-by-hop
   */
  isHopByHopHeader(header) {
    const hopByHopHeaders = [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade'
    ];
    
    return hopByHopHeaders.includes(header.toLowerCase());
  }

  /**
   * Handle proxy errors
   */
  handleProxyError(error, req, res) {
    let proxyError;
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      proxyError = errorHandlerService.serviceUnavailableError('Microservice', req.correlationId);
    } else if (error.code === 'ETIMEDOUT') {
      proxyError = errorHandlerService.timeoutError(this.defaultTimeout, req.correlationId);
    } else if (error.response) {
      // Forward the error response from microservice
      return this.forwardResponse(res, error.response);
    } else {
      proxyError = errorHandlerService.internalServerError('Proxy error', error, req.correlationId);
    }
    
    const errorResponse = errorHandlerService.formatErrorResponse(proxyError, req);
    res.status(proxyError.statusCode).json(errorResponse);
  }

  /**
   * Health check proxy
   */
  async healthCheck(req, res) {
    try {
      const services = serviceModel.getAllServices();
      const healthStatus = {};
      
      for (const service of services) {
        const stats = serviceModel.getServiceStats(service.name);
        healthStatus[service.name] = {
          status: stats.overallHealth,
          healthyInstances: stats.healthyInstances,
          totalInstances: stats.totalInstances,
          averageResponseTime: stats.averageResponseTime
        };
      }
      
      const overallHealthy = Object.values(healthStatus).every(service => 
        service.status === 'healthy' && service.healthyInstances > 0
      );
      
      res.status(overallHealthy ? 200 : 503).json({
        success: true,
        status: overallHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: healthStatus
      });
      
    } catch (error) {
      logger.error('Health check error:', error);
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: 'Health check failed'
      });
    }
  }

  /**
   * Get proxy statistics
   */
  getProxyStats() {
    return {
      services: serviceModel.getAllServiceStats(),
      loadBalancing: loadBalancerService.getLoadBalancingStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Websocket proxy (for future implementation)
   */
  async proxyWebSocket(ws, req, serviceName) {
    // TODO: Implement WebSocket proxying
    logger.info('WebSocket proxy not yet implemented');
  }
}

module.exports = new ProxyService(); 