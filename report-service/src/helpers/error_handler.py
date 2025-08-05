import logging
import traceback
from functools import wraps
from flask import jsonify, current_app

logger = logging.getLogger(__name__)

def async_error_handler(f):
    """
    @description: This function is used to handle async errors
    @param {Function} func - The function to handle
    @returns {Function} - The function to handle
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as err:
            logger.error(f'❌ Error in {f.__name__}: {str(err)}')
            logger.error(f'Stack trace: {traceback.format_exc()}')
            
            # Return a proper error response
            return jsonify({
                'success': False,
                'message': 'Internal server error',
                'error': 'INTERNAL_ERROR',
                'debug': {
                    'function': f.__name__,
                    'error': str(err)
                }
            }), 500
    
    return decorated_function

def handle_database_errors(f):
    """
    Handle database-specific errors
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as err:
            error_type = type(err).__name__
            
            if 'IntegrityError' in error_type or 'DuplicateEntry' in error_type:
                logger.warning(f'Database integrity error in {f.__name__}: {str(err)}')
                return jsonify({
                    'success': False,
                    'message': 'Data conflict occurred',
                    'error': 'DATA_CONFLICT',
                    'debug': {
                        'function': f.__name__,
                        'error': str(err)
                    }
                }), 409
            
            elif 'ConnectionError' in error_type or 'OperationalError' in error_type:
                logger.error(f'Database connection error in {f.__name__}: {str(err)}')
                return jsonify({
                    'success': False,
                    'message': 'Database connection failed',
                    'error': 'DATABASE_ERROR',
                    'debug': {
                        'function': f.__name__,
                        'error': str(err)
                    }
                }), 503
            
            else:
                logger.error(f'Database error in {f.__name__}: {str(err)}')
                return jsonify({
                    'success': False,
                    'message': 'Database operation failed',
                    'error': 'DATABASE_ERROR',
                    'debug': {
                        'function': f.__name__,
                        'error': str(err)
                    }
                }), 500
    
    return decorated_function

def handle_validation_errors(f):
    """
    Handle validation errors
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as err:
            logger.warning(f'Validation error in {f.__name__}: {str(err)}')
            return jsonify({
                'success': False,
                'message': 'Invalid input data',
                'error': 'VALIDATION_ERROR',
                'debug': {
                    'function': f.__name__,
                    'error': str(err)
                }
            }), 400
        
        except KeyError as err:
            logger.warning(f'Missing field error in {f.__name__}: {str(err)}')
            return jsonify({
                'success': False,
                'message': 'Missing required field',
                'error': 'MISSING_FIELD',
                'debug': {
                    'function': f.__name__,
                    'missing_field': str(err)
                }
            }), 400
    
    return decorated_function

def handle_external_service_errors(f):
    """
    Handle external service errors (HTTP, API calls, etc.)
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as err:
            error_type = type(err).__name__
            
            if 'ConnectionError' in error_type or 'TimeoutError' in error_type:
                logger.error(f'External service connection error in {f.__name__}: {str(err)}')
                return jsonify({
                    'success': False,
                    'message': 'External service unavailable',
                    'error': 'EXTERNAL_SERVICE_ERROR',
                    'debug': {
                        'function': f.__name__,
                        'error': str(err)
                    }
                }), 503
            
            elif 'HTTPError' in error_type:
                logger.error(f'HTTP error in {f.__name__}: {str(err)}')
                return jsonify({
                    'success': False,
                    'message': 'External service error',
                    'error': 'HTTP_ERROR',
                    'debug': {
                        'function': f.__name__,
                        'error': str(err)
                    }
                }), 502
            
            else:
                logger.error(f'External service error in {f.__name__}: {str(err)}')
                return jsonify({
                    'success': False,
                    'message': 'External service failed',
                    'error': 'EXTERNAL_SERVICE_ERROR',
                    'debug': {
                        'function': f.__name__,
                        'error': str(err)
                    }
                }), 500
    
    return decorated_function

def safe_json_response(f):
    """
    Ensure JSON responses are properly formatted
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            result = f(*args, **kwargs)
            
            # If result is already a tuple (response, status_code)
            if isinstance(result, tuple) and len(result) == 2:
                response, status_code = result
                if isinstance(response, dict):
                    return jsonify(response), status_code
                return response, status_code
            
            # If result is a dict, wrap it in jsonify
            if isinstance(result, dict):
                return jsonify(result)
            
            # Otherwise return as is
            return result
            
        except Exception as err:
            logger.error(f'JSON response error in {f.__name__}: {str(err)}')
            return jsonify({
                'success': False,
                'message': 'Response formatting error',
                'error': 'RESPONSE_ERROR',
                'debug': {
                    'function': f.__name__,
                    'error': str(err)
                }
            }), 500
    
    return decorated_function 