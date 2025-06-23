const axios = require('axios');
const logger = require('../config/logger');
const { Service, ServiceInstance } = require('../models/index.model');
const config = require('../config.json');

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
      // Get service configuration from config.json
      const service = config.services.find(s => s.name === serviceName);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: `Service ${serviceName} not found`,
          error: 'SERVICE_NOT_FOUND'
        });
      }

      // Check if authentication is required
      if (service.authentication && service.authentication.required && !req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required for this service',
          error: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Check user roles if specified
      if (service.authentication && service.authentication.roles && service.authentication.roles.length > 0 && req.user) {
        const hasRequiredRole = service.authentication.roles.some(role => req.user.roles.includes(role));
        if (!hasRequiredRole) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions for this service',
            error: 'INSUFFICIENT_PERMISSIONS'
          });
        }
      }

      // Get instance (simple round-robin for now)
      if (!service.instances || service.instances.length === 0) {
        return res.status(503).json({
          success: false,
          message: `No instances available for service ${serviceName}`,
          error: 'NO_INSTANCES_AVAILABLE'
        });
      }

      selectedInstance = service.instances[0]; // Use first instance for now

      // Build target URL
      const targetUrl = this.buildTargetUrl(selectedInstance, req.originalUrl, service.path);
      
      // Prepare request options
      const requestOptions = this.buildRequestOptions(req, service, targetUrl);

      // Make request with retry logic
      const response = await this.makeRequestWithRetry(requestOptions, service.retries || 3);

      // Forward response
      this.forwardResponse(res, response);

      logger.info('Proxy request successful', {
        serviceName,
        method: req.method,
        path: req.originalUrl,
        statusCode: response.status,
        responseTime: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Proxy request failed', {
        serviceName,
        method: req.method,
        path: req.originalUrl,
        error: error.message,
        responseTime: Date.now() - startTime
      });

      // Handle error and send response
      this.handleProxyError(error, req, res);
    }
  }

  /**
   * Build target URL for the request
   */
  buildTargetUrl(instance, originalUrl, servicePath) {
    const baseUrl = `http://${instance.host}:${instance.port}`;
    
    // Remove service path from original URL and replace with service route
    let targetPath = originalUrl;
    if (servicePath && originalUrl.startsWith(servicePath)) {
      // Remove the API Gateway path prefix and use the internal service path
      targetPath = originalUrl.substring(servicePath.length);
      // For passenger service, map to /v1/passengers
      if (!targetPath.startsWith('/v1/')) {
        targetPath = '/v1' + targetPath;
      }
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
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable',
        error: 'SERVICE_UNAVAILABLE'
      });
    } else if (error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        success: false,
        message: 'Request timeout',
        error: 'REQUEST_TIMEOUT'
      });
    } else if (error.response) {
      // Forward the error response from microservice
      return this.forwardResponse(res, error.response);
    } else {
      return res.status(500).json({
        success: false,
        message: 'Internal proxy error',
        error: 'PROXY_ERROR'
      });
    }
  }

  /**
   * Health check proxy
   */
  async healthCheck(req, res) {
    try {
      const healthStatus = {};
      
      for (const service of config.services) {
        healthStatus[service.name] = {
          status: 'healthy',
          instances: service.instances.length,
          path: service.path
        };
      }
      
      res.status(200).json({
        success: true,
        status: 'healthy',
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
      services: config.services.length,
      uptime: process.uptime(),
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