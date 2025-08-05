import asyncio
import json
from typing import Dict, Any
from ..config.logger import logger
from ..kafka.kafka_consumer import KafkaEventConsumer
from ..services.report_service import ReportService
from ..config.database import SessionLocal

class ReportEventConsumer:
    """Consumer for report-related Kafka events"""
    
    def __init__(self):
        self.consumer = None
        self.db = SessionLocal()
        self.report_service = ReportService(self.db)
    
    async def start(self):
        """Start the report event consumer"""
        try:
            # Kafka configuration
            kafka_config = {
                'client_id': 'report-service-consumer',
                'brokers': ['localhost:9092'],  # Configure from environment
                'groupId': 'report-service-group',
                'topics': [
                    'ticket-events',
                    'payment-events', 
                    'user-events',
                    'transport-events'
                ],
                'message_handler': self.handle_message
            }
            
            self.consumer = KafkaEventConsumer(**kafka_config)
            await self.consumer.start()
            
            logger.info("Report event consumer started successfully")
            
        except Exception as e:
            logger.error("Failed to start report event consumer", error=str(e))
            raise
    
    async def stop(self):
        """Stop the report event consumer"""
        if self.consumer:
            await self.consumer.stop()
            logger.info("Report event consumer stopped")
        
        if self.db:
            self.db.close()
    
    async def handle_message(self, message: Dict[str, Any]):
        """Handle incoming Kafka messages"""
        try:
            event_type = message.get('type')
            event_data = message.get('data', {})
            
            logger.info("Processing report event", event_type=event_type)
            
            if event_type == 'ticket_created':
                await self.handle_ticket_created(event_data)
            elif event_type == 'payment_completed':
                await self.handle_payment_completed(event_data)
            elif event_type == 'user_registered':
                await self.handle_user_registered(event_data)
            elif event_type == 'route_updated':
                await self.handle_route_updated(event_data)
            else:
                logger.warning("Unknown event type", event_type=event_type)
                
        except Exception as e:
            logger.error("Error handling message", error=str(e), message=message)
            raise
    
    async def handle_ticket_created(self, data: Dict[str, Any]):
        """Handle ticket created event"""
        try:
            ticket_id = data.get('ticket_id')
            passenger_id = data.get('passenger_id')
            route_id = data.get('route_id')
            fare = data.get('fare')
            created_at = data.get('created_at')
            
            # Update ticket metrics
            await self.update_ticket_metrics(ticket_id, passenger_id, route_id, fare, created_at)
            
            logger.info("Ticket created event processed", ticket_id=ticket_id)
            
        except Exception as e:
            logger.error("Error handling ticket created event", error=str(e))
            raise
    
    async def handle_payment_completed(self, data: Dict[str, Any]):
        """Handle payment completed event"""
        try:
            payment_id = data.get('payment_id')
            ticket_id = data.get('ticket_id')
            amount = data.get('amount')
            payment_method = data.get('payment_method')
            completed_at = data.get('completed_at')
            
            # Update payment metrics
            await self.update_payment_metrics(payment_id, ticket_id, amount, payment_method, completed_at)
            
            logger.info("Payment completed event processed", payment_id=payment_id)
            
        except Exception as e:
            logger.error("Error handling payment completed event", error=str(e))
            raise
    
    async def handle_user_registered(self, data: Dict[str, Any]):
        """Handle user registered event"""
        try:
            user_id = data.get('user_id')
            username = data.get('username')
            email = data.get('email')
            role = data.get('role')
            registered_at = data.get('registered_at')
            
            # Update user metrics
            await self.update_user_metrics(user_id, username, email, role, registered_at)
            
            logger.info("User registered event processed", user_id=user_id)
            
        except Exception as e:
            logger.error("Error handling user registered event", error=str(e))
            raise
    
    async def handle_route_updated(self, data: Dict[str, Any]):
        """Handle route updated event"""
        try:
            route_id = data.get('route_id')
            route_name = data.get('route_name')
            stations = data.get('stations', [])
            updated_at = data.get('updated_at')
            
            # Update route metrics
            await self.update_route_metrics(route_id, route_name, stations, updated_at)
            
            logger.info("Route updated event processed", route_id=route_id)
            
        except Exception as e:
            logger.error("Error handling route updated event", error=str(e))
            raise
    
    async def update_ticket_metrics(self, ticket_id: str, passenger_id: str, route_id: str, fare: float, created_at: str):
        """Update ticket-related metrics"""
        try:
            # Create or update ticket metrics
            metric_data = {
                'metric_name': 'ticket_created',
                'metric_value': 1,
                'metric_unit': 'count',
                'metadata': {
                    'ticket_id': ticket_id,
                    'passenger_id': passenger_id,
                    'route_id': route_id,
                    'fare': fare,
                    'created_at': created_at
                }
            }
            
            # Store metric in database
            from ..models.report_model import ReportMetric
            metric = ReportMetric(**metric_data)
            self.db.add(metric)
            self.db.commit()
            
            logger.debug("Ticket metrics updated", ticket_id=ticket_id)
            
        except Exception as e:
            logger.error("Error updating ticket metrics", error=str(e))
            raise
    
    async def update_payment_metrics(self, payment_id: str, ticket_id: str, amount: float, payment_method: str, completed_at: str):
        """Update payment-related metrics"""
        try:
            # Create or update payment metrics
            metric_data = {
                'metric_name': 'payment_completed',
                'metric_value': amount,
                'metric_unit': 'currency',
                'metadata': {
                    'payment_id': payment_id,
                    'ticket_id': ticket_id,
                    'payment_method': payment_method,
                    'completed_at': completed_at
                }
            }
            
            # Store metric in database
            from ..models.report_model import ReportMetric
            metric = ReportMetric(**metric_data)
            self.db.add(metric)
            self.db.commit()
            
            logger.debug("Payment metrics updated", payment_id=payment_id)
            
        except Exception as e:
            logger.error("Error updating payment metrics", error=str(e))
            raise
    
    async def update_user_metrics(self, user_id: str, username: str, email: str, role: str, registered_at: str):
        """Update user-related metrics"""
        try:
            # Create or update user metrics
            metric_data = {
                'metric_name': 'user_registered',
                'metric_value': 1,
                'metric_unit': 'count',
                'metadata': {
                    'user_id': user_id,
                    'username': username,
                    'email': email,
                    'role': role,
                    'registered_at': registered_at
                }
            }
            
            # Store metric in database
            from ..models.report_model import ReportMetric
            metric = ReportMetric(**metric_data)
            self.db.add(metric)
            self.db.commit()
            
            logger.debug("User metrics updated", user_id=user_id)
            
        except Exception as e:
            logger.error("Error updating user metrics", error=str(e))
            raise
    
    async def update_route_metrics(self, route_id: str, route_name: str, stations: list, updated_at: str):
        """Update route-related metrics"""
        try:
            # Create or update route metrics
            metric_data = {
                'metric_name': 'route_updated',
                'metric_value': len(stations),
                'metric_unit': 'stations',
                'metadata': {
                    'route_id': route_id,
                    'route_name': route_name,
                    'stations': stations,
                    'updated_at': updated_at
                }
            }
            
            # Store metric in database
            from ..models.report_model import ReportMetric
            metric = ReportMetric(**metric_data)
            self.db.add(metric)
            self.db.commit()
            
            logger.debug("Route metrics updated", route_id=route_id)
            
        except Exception as e:
            logger.error("Error updating route metrics", error=str(e))
            raise 