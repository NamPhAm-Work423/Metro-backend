import asyncio
import json
import os
from typing import Dict, Any
from ..config.logger import logger
from ..kafka.kafka_consumer import KafkaEventConsumer
from ..services.report_service import ReportService
from ..config.database import SessionLocal
from ..config.settings import get_settings

class ReportEventConsumer:
    """Consumer for report-related Kafka events"""
    
    def __init__(self):
        self.consumer = None
        self.db = SessionLocal()
        self.report_service = ReportService(self.db)
    
    async def start(self):
        """Start the report event consumer"""
        try:
            settings = get_settings()
            # Kafka configuration
            kafka_config = {
                'client_id': settings.KAFKA_CLIENT_ID,
                'brokers': settings.kafka_brokers_list,
                'group_id': settings.KAFKA_GROUP_ID,
                'topics': [
                    settings.USER_CREATED_TOPIC,
                    settings.USER_LOGIN_TOPIC,
                    settings.TICKET_CREATED_TOPIC,
                    settings.TICKET_ACTIVATED_TOPIC,
                    settings.TICKET_CANCELLED_TOPIC,
                    settings.TICKET_USED_TOPIC,
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
            topic = message.get('topic')
            data = message.get('value', {})

            logger.info("Processing report event", topic=topic)

            settings = get_settings()
            if topic == settings.USER_CREATED_TOPIC:
                await self.handle_user_registered(data)
            elif topic == settings.USER_LOGIN_TOPIC:
                await self.handle_user_login(data)
            elif topic == settings.TICKET_CREATED_TOPIC:
                await self.handle_ticket_created(data)
            elif topic == settings.TICKET_ACTIVATED_TOPIC:
                await self.handle_ticket_activated(data)
            elif topic == settings.TICKET_CANCELLED_TOPIC:
                await self.handle_ticket_cancelled(data)
            elif topic == settings.TICKET_USED_TOPIC:
                await self.handle_ticket_used(data)
            else:
                logger.warn("Unhandled topic for report consumer", topic=topic)

        except Exception as e:
            logger.error("Error handling message", error=str(e), message=message)
            raise
    
    async def handle_ticket_created(self, data: Dict[str, Any]):
        """Handle ticket created event"""
        try:
            ticket_id = data.get('ticketId') or data.get('ticket_id')
            passenger_id = data.get('passengerId') or data.get('passenger_id')
            amount = data.get('amount')
            created_at = data.get('createdAt') or data.get('created_at')
            ticket_data = data.get('ticketData') or {}
            origin_station_id = ticket_data.get('originStationId')
            destination_station_id = ticket_data.get('destinationStationId')
            route_key = f"{origin_station_id}-{destination_station_id}" if origin_station_id and destination_station_id else None

            metric_data = {
                'metric_name': 'ticket_created',
                'metric_value': 1,
                'metric_unit': 'count',
                'metadata': {
                    'ticket_id': ticket_id,
                    'passenger_id': passenger_id,
                    'amount': amount,
                    'origin_station_id': origin_station_id,
                    'destination_station_id': destination_station_id,
                    'route_key': route_key,
                    'created_at': created_at
                }
            }

            from ..models.report_model import ReportMetric
            metric = ReportMetric(**metric_data)
            self.db.add(metric)
            self.db.commit()

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

    async def handle_user_login(self, data: Dict[str, Any]):
        """Handle user login event for analytics"""
        try:
            user_id = data.get('userId') or data.get('user_id')
            username = data.get('username')
            roles = data.get('roles')
            logged_at = data.get('loggedAt') or data.get('logged_at') or data.get('createdAt')

            metric_data = {
                'metric_name': 'user_login',
                'metric_value': 1,
                'metric_unit': 'count',
                'metadata': {
                    'user_id': user_id,
                    'username': username,
                    'roles': roles,
                    'logged_at': logged_at
                }
            }

            from ..models.report_model import ReportMetric
            metric = ReportMetric(**metric_data)
            self.db.add(metric)
            self.db.commit()

            logger.debug("User login metrics updated", user_id=user_id)

        except Exception as e:
            logger.error("Error handling user login event", error=str(e))
            raise

    async def handle_ticket_activated(self, data: Dict[str, Any]):
        """Handle ticket activated event for analytics"""
        try:
            ticket_id = data.get('ticketId') or data.get('ticket_id')
            passenger_id = data.get('passengerId') or data.get('passenger_id')
            activated_at = data.get('activatedAt') or data.get('activated_at')

            metric_data = {
                'metric_name': 'ticket_activated',
                'metric_value': 1,
                'metric_unit': 'count',
                'metadata': {
                    'ticket_id': ticket_id,
                    'passenger_id': passenger_id,
                    'activated_at': activated_at
                }
            }

            from ..models.report_model import ReportMetric
            metric = ReportMetric(**metric_data)
            self.db.add(metric)
            self.db.commit()

            logger.debug("Ticket activated metrics updated", ticket_id=ticket_id)

        except Exception as e:
            logger.error("Error handling ticket activated event", error=str(e))
            raise

    async def handle_ticket_cancelled(self, data: Dict[str, Any]):
        """Handle ticket cancelled event for analytics"""
        try:
            ticket_id = data.get('ticketId') or data.get('ticket_id')
            passenger_id = data.get('passengerId') or data.get('passenger_id')
            reason = data.get('reason')
            cancelled_at = data.get('cancelledAt') or data.get('cancelled_at')

            metric_data = {
                'metric_name': 'ticket_cancelled',
                'metric_value': 1,
                'metric_unit': 'count',
                'metadata': {
                    'ticket_id': ticket_id,
                    'passenger_id': passenger_id,
                    'reason': reason,
                    'cancelled_at': cancelled_at
                }
            }

            from ..models.report_model import ReportMetric
            metric = ReportMetric(**metric_data)
            self.db.add(metric)
            self.db.commit()

            logger.debug("Ticket cancelled metrics updated", ticket_id=ticket_id)

        except Exception as e:
            logger.error("Error handling ticket cancelled event", error=str(e))
            raise

    async def handle_ticket_used(self, data: Dict[str, Any]):
        """Handle ticket used event for analytics"""
        try:
            ticket_id = data.get('ticketId') or data.get('ticket_id')
            passenger_id = data.get('passengerId') or data.get('passenger_id')
            used_at = data.get('usedAt') or data.get('used_at')
            station_id = (data.get('usageData') or {}).get('stationId')

            metric_data = {
                'metric_name': 'ticket_used',
                'metric_value': 1,
                'metric_unit': 'count',
                'metadata': {
                    'ticket_id': ticket_id,
                    'passenger_id': passenger_id,
                    'station_id': station_id,
                    'used_at': used_at
                }
            }

            from ..models.report_model import ReportMetric
            metric = ReportMetric(**metric_data)
            self.db.add(metric)
            self.db.commit()

            logger.debug("Ticket used metrics updated", ticket_id=ticket_id)

        except Exception as e:
            logger.error("Error handling ticket used event", error=str(e))
            raise
    
    async def handle_user_registered(self, data: Dict[str, Any]):
        """Handle user registered event"""
        try:
            user_id = data.get('userId') or data.get('user_id')
            username = data.get('username')
            email = data.get('email')
            # roles could be list; pick primary
            roles = data.get('roles')
            role = roles[0] if isinstance(roles, list) and roles else (data.get('role') or 'user')
            registered_at = data.get('registeredAt') or data.get('registered_at') or data.get('createdAt')

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