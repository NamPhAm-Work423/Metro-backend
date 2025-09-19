# 🛣️ Adding Tracing to Routes and Logs

## Node.js Services - Express Routes

### 1. Basic Route Tracing

Update your route handlers to include custom spans:

#### Example: API Gateway Routes

```javascript
// api-gateway/src/routes/auth.routes.js
const express = require('express');
const { addCustomSpan } = require('../tracing');
const router = express.Router();

router.post('/login', async (req, res) => {
  await addCustomSpan('auth.login', async (span) => {
    // Add useful attributes
    span.setAttributes({
      'auth.method': 'email',
      'user.type': req.body.userType || 'unknown',
      'request.ip': req.ip
    });

    try {
      const { email, password, userType } = req.body;
      
      // Business logic with nested spans
      const authResult = await addCustomSpan('auth.validate-credentials', async (authSpan) => {
        authSpan.setAttributes({
          'user.email': email,
          'user.type': userType
        });
        
        // Your authentication logic here
        const result = await authService.login(email, password, userType);
        
        authSpan.setAttributes({
          'auth.success': !!result.success,
          'user.id': result.user?.id || 'none'
        });
        
        return result;
      });

      if (authResult.success) {
        span.setAttributes({
          'auth.result': 'success',
          'user.id': authResult.user.id
        });
        
        res.json(authResult);
      } else {
        span.setAttributes({
          'auth.result': 'failure',
          'auth.error': authResult.message
        });
        
        res.status(401).json(authResult);
      }
    } catch (error) {
      span.recordException(error);
      span.setAttributes({
        'auth.result': 'error',
        'error.message': error.message
      });
      
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
});

module.exports = router;
```

#### Example: User Service Routes

```javascript
// user-service/src/routes/user.routes.js
const express = require('express');
const { addCustomSpan } = require('../tracing');
const router = express.Router();

router.get('/profile/:userId', async (req, res) => {
  await addCustomSpan('user.get-profile', async (span) => {
    const { userId } = req.params;
    
    span.setAttributes({
      'user.id': userId,
      'operation.type': 'read',
      'request.authenticated': !!req.user
    });

    try {
      // Database operation with tracing
      const profile = await addCustomSpan('user.db.find-by-id', async (dbSpan) => {
        dbSpan.setAttributes({
          'db.operation': 'SELECT',
          'db.table': 'users',
          'db.user.id': userId
        });
        
        const result = await User.findByPk(userId);
        
        dbSpan.setAttributes({
          'db.result.found': !!result,
          'db.query.duration_ms': Date.now() - dbSpan.startTime
        });
        
        return result;
      });

      if (profile) {
        span.setAttributes({
          'user.found': true,
          'user.profile.type': profile.userType
        });
        
        res.json({ success: true, user: profile });
      } else {
        span.setAttributes({
          'user.found': false,
          'response.status': 404
        });
        
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (error) {
      span.recordException(error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
});

router.post('/users', async (req, res) => {
  await addCustomSpan('user.create', async (span) => {
    const userData = req.body;
    
    span.setAttributes({
      'user.type': userData.userType,
      'operation.type': 'create',
      'request.body.size': JSON.stringify(userData).length
    });

    try {
      // Validation span
      await addCustomSpan('user.validate', async (validateSpan) => {
        validateSpan.setAttributes({
          'validation.fields': Object.keys(userData).join(','),
          'validation.required': ['email', 'name', 'userType'].join(',')
        });
        
        // Your validation logic
        if (!userData.email || !userData.name) {
          throw new Error('Missing required fields');
        }
      });

      // Create user span
      const newUser = await addCustomSpan('user.db.create', async (createSpan) => {
        createSpan.setAttributes({
          'db.operation': 'INSERT',
          'db.table': 'users',
          'user.email': userData.email
        });
        
        const user = await User.create(userData);
        
        createSpan.setAttributes({
          'db.result.id': user.id,
          'user.created': true
        });
        
        return user;
      });

      // Kafka event span
      await addCustomSpan('user.publish-event', async (eventSpan) => {
        eventSpan.setAttributes({
          'kafka.topic': 'user.created',
          'kafka.key': newUser.id,
          'event.type': 'user.created'
        });
        
        await kafkaProducer.send({
          topic: 'user.created',
          messages: [{ key: newUser.id, value: JSON.stringify(newUser) }]
        });
      });

      span.setAttributes({
        'user.created.id': newUser.id,
        'operation.success': true
      });

      res.status(201).json({ success: true, user: newUser });
    } catch (error) {
      span.recordException(error);
      span.setAttributes({
        'operation.success': false,
        'error.type': error.constructor.name
      });
      
      res.status(400).json({ success: false, message: error.message });
    }
  });
});

module.exports = router;
```

### 2. Logging Integration with Traces

Update your Winston logger to include trace information:

#### Enhanced Logger Configuration

```javascript
// src/config/logger.js (for any Node.js service)
const winston = require('winston');
const { trace } = require('@opentelemetry/api');

// Custom format to include trace information
const tracingFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const span = trace.getActiveSpan();
  let traceInfo = '';
  
  if (span) {
    const spanContext = span.spanContext();
    traceInfo = `[trace_id=${spanContext.traceId} span_id=${spanContext.spanId}] `;
  }
  
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} ${level.toUpperCase()} ${traceInfo}${message} ${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    tracingFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        tracingFormat
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Helper functions for structured logging
logger.traceLog = (message, data = {}) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    logger.info(message, {
      ...data,
      traceId: spanContext.traceId,
      spanId: spanContext.spanId
    });
  } else {
    logger.info(message, data);
  }
};

logger.traceError = (message, error, data = {}) => {
  const span = trace.getActiveSpan();
  if (span) {
    const spanContext = span.spanContext();
    span.recordException(error);
    logger.error(message, {
      ...data,
      error: error.message,
      stack: error.stack,
      traceId: spanContext.traceId,
      spanId: spanContext.spanId
    });
  } else {
    logger.error(message, { ...data, error: error.message, stack: error.stack });
  }
};

module.exports = logger;
```

#### Using Enhanced Logger in Routes

```javascript
// Example usage in routes
const logger = require('../config/logger');

router.post('/payment', async (req, res) => {
  await addCustomSpan('payment.process', async (span) => {
    const { amount, userId, paymentMethod } = req.body;
    
    logger.traceLog('Payment processing started', {
      userId,
      amount,
      paymentMethod,
      operation: 'payment.process'
    });

    try {
      const result = await processPayment(amount, userId, paymentMethod);
      
      logger.traceLog('Payment processed successfully', {
        userId,
        paymentId: result.id,
        status: result.status
      });
      
      res.json(result);
    } catch (error) {
      logger.traceError('Payment processing failed', error, {
        userId,
        amount,
        paymentMethod
      });
      
      res.status(500).json({ success: false, message: 'Payment failed' });
    }
  });
});
```

## Python Services - FastAPI/Flask Routes

### 1. FastAPI with Tracing

```python
# report-service/src/routes/reports.py
from fastapi import APIRouter, HTTPException
from tracing import custom_span, trace_function
import logging

# Configure logger with tracing
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/generate")
async def generate_report(report_request: dict):
    with custom_span("report.generate", 
                     report_type=report_request.get('type'),
                     user_id=report_request.get('userId')) as span:
        
        logger.info(f"Starting report generation: {report_request.get('type')}")
        
        try:
            # Data collection span
            with custom_span("report.collect-data") as data_span:
                data_span.set_attribute("data.source", "database")
                data_span.set_attribute("data.date_range", report_request.get('dateRange'))
                
                data = await collect_report_data(report_request)
                data_span.set_attribute("data.records_count", len(data))
            
            # Processing span  
            with custom_span("report.process-data") as process_span:
                process_span.set_attribute("processing.algorithm", "statistical_analysis")
                
                processed_data = await process_data(data)
                process_span.set_attribute("processing.output_size", len(processed_data))
            
            # Generation span
            with custom_span("report.generate-file") as gen_span:
                gen_span.set_attribute("output.format", report_request.get('format', 'pdf'))
                
                report_file = await generate_report_file(processed_data, report_request)
                gen_span.set_attribute("output.file_size", len(report_file))
                gen_span.set_attribute("output.file_path", report_file.get('path'))
            
            span.set_attribute("report.generation.success", True)
            span.set_attribute("report.id", report_file.get('id'))
            
            logger.info(f"Report generated successfully: {report_file.get('id')}")
            
            return {
                "success": True,
                "report": report_file,
                "message": "Report generated successfully"
            }
            
        except Exception as e:
            span.record_exception(e)
            span.set_attribute("report.generation.success", False)
            span.set_attribute("error.type", type(e).__name__)
            
            logger.error(f"Report generation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

@trace_function("report.list")
async def list_reports(user_id: str, limit: int = 10):
    logger.info(f"Listing reports for user: {user_id}")
    
    with custom_span("report.db.query", 
                     user_id=user_id, 
                     query_limit=limit) as span:
        try:
            reports = await db.query_reports(user_id, limit)
            span.set_attribute("db.result_count", len(reports))
            
            logger.info(f"Found {len(reports)} reports for user {user_id}")
            return reports
            
        except Exception as e:
            span.record_exception(e)
            logger.error(f"Failed to list reports: {str(e)}")
            raise
```

### 2. Flask with Tracing

```python
# control-service/src/routes/control.py
from flask import Blueprint, request, jsonify
from tracing import custom_span, trace_function
import logging

# Enhanced logging with trace info
class TraceFormatter(logging.Formatter):
    def format(self, record):
        from opentelemetry import trace
        span = trace.get_current_span()
        
        if span.is_recording():
            span_context = span.get_span_context()
            record.trace_id = format(span_context.trace_id, '032x')
            record.span_id = format(span_context.span_id, '016x')
        else:
            record.trace_id = '0' * 32
            record.span_id = '0' * 16
            
        return super().format(record)

# Configure logger
logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
handler.setFormatter(TraceFormatter(
    '%(asctime)s %(levelname)s [%(name)s] [trace_id=%(trace_id)s span_id=%(span_id)s] - %(message)s'
))
logger.addHandler(handler)
logger.setLevel(logging.INFO)

control_bp = Blueprint('control', __name__, url_prefix='/api/control')

@control_bp.route('/optimize', methods=['POST'])
def optimize_route():
    with custom_span("control.optimize-route") as span:
        data = request.get_json()
        route_id = data.get('routeId')
        
        span.set_attribute("route.id", route_id)
        span.set_attribute("optimization.type", data.get('type', 'standard'))
        
        logger.info(f"Starting route optimization for route: {route_id}")
        
        try:
            # Load current route data
            with custom_span("control.load-route-data") as load_span:
                load_span.set_attribute("data.source", "database")
                
                route_data = load_route_data(route_id)
                load_span.set_attribute("route.stations_count", len(route_data.get('stations', [])))
                load_span.set_attribute("route.current_efficiency", route_data.get('efficiency', 0))
            
            # Run optimization algorithm
            with custom_span("control.run-optimization") as opt_span:
                opt_span.set_attribute("algorithm.type", "genetic_algorithm")
                opt_span.set_attribute("algorithm.iterations", 1000)
                
                optimization_result = run_optimization_algorithm(route_data, data)
                
                opt_span.set_attribute("optimization.improvement", optimization_result.get('improvement'))
                opt_span.set_attribute("optimization.new_efficiency", optimization_result.get('efficiency'))
            
            # Apply optimizations
            with custom_span("control.apply-optimization") as apply_span:
                apply_span.set_attribute("changes.count", len(optimization_result.get('changes', [])))
                
                apply_optimization(route_id, optimization_result)
                apply_span.set_attribute("application.success", True)
            
            span.set_attribute("optimization.success", True)
            span.set_attribute("optimization.improvement_percent", optimization_result.get('improvement'))
            
            logger.info(f"Route optimization completed successfully: {optimization_result.get('improvement')}% improvement")
            
            return jsonify({
                "success": True,
                "optimization": optimization_result,
                "message": "Route optimized successfully"
            })
            
        except Exception as e:
            span.record_exception(e)
            span.set_attribute("optimization.success", False)
            
            logger.error(f"Route optimization failed: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500

@control_bp.route('/predict/<route_id>', methods=['GET'])
@trace_function("control.predict-demand")
def predict_demand(route_id):
    logger.info(f"Predicting demand for route: {route_id}")
    
    with custom_span("control.prediction",
                     route_id=route_id,
                     prediction_type="demand") as span:
        try:
            # Load historical data
            with custom_span("control.load-historical-data") as hist_span:
                historical_data = load_historical_data(route_id)
                hist_span.set_attribute("data.records_count", len(historical_data))
                hist_span.set_attribute("data.date_range_days", historical_data.get('date_range_days'))
            
            # Run prediction model
            with custom_span("control.run-prediction-model") as pred_span:
                pred_span.set_attribute("model.type", "prophet")
                pred_span.set_attribute("model.version", "1.1.6")
                
                predictions = run_demand_prediction(historical_data)
                pred_span.set_attribute("predictions.count", len(predictions))
                pred_span.set_attribute("predictions.accuracy", predictions.get('accuracy'))
            
            span.set_attribute("prediction.success", True)
            span.set_attribute("prediction.confidence", predictions.get('confidence'))
            
            logger.info(f"Demand prediction completed with {predictions.get('confidence')}% confidence")
            
            return jsonify({
                "success": True,
                "predictions": predictions,
                "route_id": route_id
            })
            
        except Exception as e:
            span.record_exception(e)
            logger.error(f"Demand prediction failed: {str(e)}")
            return jsonify({"success": False, "error": str(e)}), 500
```

## Best Practices

### 1. Meaningful Span Names
- Use hierarchical names: `service.operation` (e.g., `user.create`, `payment.process`)
- Be specific: `auth.validate-credentials` instead of just `validate`

### 2. Rich Span Attributes
```javascript
span.setAttributes({
  'user.id': userId,
  'user.type': userType,
  'operation.type': 'create',
  'request.method': req.method,
  'request.url': req.originalUrl,
  'response.status_code': res.statusCode,
  'business.category': 'authentication',
  'performance.duration_ms': Date.now() - startTime
});
```

### 3. Error Handling
```javascript
try {
  // business logic
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: 2, message: error.message }); // ERROR
  span.setAttributes({
    'error.type': error.constructor.name,
    'error.handled': true
  });
  throw error;
}
```

### 4. Database Query Tracing
```javascript
await addCustomSpan('db.query', async (dbSpan) => {
  dbSpan.setAttributes({
    'db.system': 'postgresql',
    'db.operation': 'SELECT',
    'db.table': 'users',
    'db.query.duration_ms': queryTime
  });
  
  return await User.findAll(query);
});
```

### 5. External API Calls
```javascript
await addCustomSpan('external.api.call', async (apiSpan) => {
  apiSpan.setAttributes({
    'http.method': 'POST',
    'http.url': apiEndpoint,
    'external.service': 'payment-gateway',
    'http.status_code': response.status
  });
  
  return await axios.post(apiEndpoint, data);
});
```

Với setup này, bạn sẽ có complete end-to-end tracing từ request → routes → business logic → database → external APIs, tất cả đều được log với trace IDs để dễ debugging! 🎯
