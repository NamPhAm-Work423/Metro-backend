import jwt
import logging
from functools import wraps
from flask import request, jsonify, current_app
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def verify_service_auth(f):
    """
    🔐 SECURE: Verify service-to-service JWT token
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('x-service-auth')
        
        logger.debug('🔍 Service Auth Debug:', {
            'hasAuthHeader': bool(auth_header),
            'authHeaderPreview': auth_header[:20] + '...' if auth_header else 'null',
            'allHeaders': list(request.headers.keys()),
            'serviceJwtSecret': bool(current_app.config.get('SERVICE_JWT_SECRET'))
        })
        
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.error('Missing service auth header:', {
                'authHeader': auth_header,
                'headers': dict(request.headers)
            })
            return jsonify({
                'success': False,
                'message': 'Service authentication required',
                'error': 'MISSING_SERVICE_AUTH',
                'debug': {
                    'hasAuthHeader': bool(auth_header),
                    'headerFormat': 'Invalid format' if auth_header else 'Missing'
                }
            }), 401

        token = auth_header.split(' ')[1]
        
        try:
            service_jwt_secret = current_app.config.get('SERVICE_JWT_SECRET')
            if not service_jwt_secret:
                logger.error('SERVICE_JWT_SECRET not found in environment')
                raise ValueError('SERVICE_JWT_SECRET environment variable is required')

            logger.debug('🔑 Attempting to verify service JWT:', {
                'tokenPrefix': token[:20] + '...',
                'secretAvailable': bool(service_jwt_secret),
                'secretPrefix': service_jwt_secret[:10] + '...'
            })

            decoded = jwt.decode(
                token, 
                service_jwt_secret, 
                algorithms=['HS256'],
                options={
                    'verify_issuer': True,
                    'verify_audience': True
                },
                issuer='api-gateway',
                audience='internal-services'
            )

            logger.debug('JWT decoded successfully:', {
                'userId': decoded.get('userId'),
                'email': decoded.get('email'),
                'roles': decoded.get('roles'),
                'issuer': decoded.get('iss'),
                'audience': decoded.get('aud'),
                'issuedAt': decoded.get('iat'),
                'expiresAt': decoded.get('exp')
            })

            # Verify token is not too old (max 5 minutes)
            current_time = datetime.utcnow().timestamp()
            token_age = current_time - decoded.get('iat', 0)
            
            logger.debug('⏰ Token age check:', {
                'currentTime': current_time,
                'issuedAt': decoded.get('iat'),
                'tokenAge': token_age,
                'maxAge': 300,
                'isValid': token_age <= 300
            })

            if token_age > 300:  # 5 minutes
                logger.error('Token too old:', {
                    'tokenAge': token_age,
                    'maxAge': 300
                })
                return jsonify({
                    'success': False,
                    'message': 'Service token expired',
                    'error': 'TOKEN_TOO_OLD',
                    'debug': {
                        'tokenAge': token_age,
                        'maxAge': 300
                    }
                }), 401

            # Extract authenticated user information
            request.user = {
                'id': decoded.get('userId'),
                'email': decoded.get('email'),
                'roles': decoded.get('roles', [])
            }

            logger.debug('Service authentication verified', {
                'userId': decoded.get('userId'),
                'roles': decoded.get('roles'),
                'tokenAge': f'{token_age}s'
            })

            return f(*args, **kwargs)
            
        except jwt.InvalidTokenError as error:
            logger.error('Service JWT verification failed:', {
                'errorName': type(error).__name__,
                'errorMessage': str(error),
                'tokenPrefix': token[:20] + '...' if token else 'null'
            })

            if isinstance(error, jwt.InvalidSignatureError):
                return jsonify({
                    'success': False,
                    'message': 'Invalid service token',
                    'error': 'INVALID_SERVICE_TOKEN',
                    'debug': {
                        'reason': str(error),
                        'tokenPreview': token[:20] + '...' if token else 'null'
                    }
                }), 401
            
            if isinstance(error, jwt.ExpiredSignatureError):
                return jsonify({
                    'success': False,
                    'message': 'Service token expired',
                    'error': 'EXPIRED_SERVICE_TOKEN',
                    'debug': {
                        'reason': str(error)
                    }
                }), 401

            logger.error('Service auth verification error:', error)
            return jsonify({
                'success': False,
                'message': 'Service authentication failed',
                'error': 'SERVICE_AUTH_ERROR',
                'debug': {
                    'errorType': type(error).__name__,
                    'errorMessage': str(error)
                }
            }), 500

    return decorated_function

def extract_user(f):
    """
    Extract user information from API Gateway headers (DEPRECATED)
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        logger.warning('DEPRECATED: Using insecure header-based authentication')
        
        user_id = request.headers.get('x-user-id')
        email = request.headers.get('x-user-email')
        roles_header = request.headers.get('x-user-roles')

        if not user_id:
            return jsonify({
                'success': False,
                'message': 'User authentication required'
            }), 401

        roles = ['user']  # default role
        if roles_header:
            try:
                import json
                roles = json.loads(roles_header)
            except (json.JSONDecodeError, TypeError) as error:
                logger.error('Failed to parse user roles:', error)

        request.user = {
            'id': user_id,
            'email': email,
            'roles': roles
        }
        return f(*args, **kwargs)

    return decorated_function

def authorize_roles(*required_roles):
    """
    Authorization decorator that checks user roles
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(request, 'user') or not request.user or not request.user.get('roles'):
                return jsonify({
                    'success': False,
                    'message': 'Authentication required'
                }), 401

            # Check if user has any of the required roles
            user_roles = request.user.get('roles', [])
            has_role = any(role in user_roles for role in required_roles)
            
            if not has_role:
                return jsonify({
                    'success': False,
                    'message': 'Insufficient permissions',
                    'required': list(required_roles),
                    'current': user_roles
                }), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def legacy_authorize_roles(*required_roles):
    """
    Legacy authorization (DEPRECATED - use authorize_roles instead)
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            logger.warning('DEPRECATED: Using legacy authorization. Upgrade to secure authorize_roles')
            
            if not hasattr(request, 'user') or not request.user or not request.user.get('roles'):
                return jsonify({
                    'success': False,
                    'message': 'Authentication required'
                }), 401

            # Check if user has any of the required roles
            user_roles = request.user.get('roles', [])
            has_role = any(role in user_roles for role in required_roles)
            
            if not has_role:
                return jsonify({
                    'success': False,
                    'message': 'Insufficient permissions'
                }), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator 