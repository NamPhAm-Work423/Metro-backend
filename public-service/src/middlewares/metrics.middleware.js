const { httpRequestDuration } = require('../config/metrics');

function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer({
    method: req.method,
    route: req.route?.path || req.path,
  });

  res.on('finish', () => {
    end({ status_code: res.statusCode });
  });

  next();
} 

module.exports = metricsMiddleware;