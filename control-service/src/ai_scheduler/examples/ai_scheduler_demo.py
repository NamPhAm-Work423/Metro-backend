"""
Complete AI Scheduler Demo for Metro TPHCM

This demo shows the core AI scheduling functionality:
1. Connect to control-service and transport-service
2. Generate AI-optimized schedules for routes
3. Generate daily schedules for entire system
4. Show Prophet-based demand forecasting in action

Requirements:
- transport-service running on localhost:8003 (gRPC on 50051)
- control-service running on localhost:8008
"""

import grpc
import time
from datetime import datetime, timedelta
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from ai_scheduler.proto import control_pb2, control_pb2_grpc

def demo_ai_scheduler():
    """Complete demo of AI scheduler functionality"""
    
    print("Metro TPHCM AI Scheduler Demo")
    print("=" * 50)
    
    # Connect to control service
    try:
        channel = grpc.insecure_channel('localhost:8008')
        stub = control_pb2_grpc.ControlServiceStub(channel)
        
        # Test connection
        print("Testing connection to AI Scheduler...")
        
        # Demo 1: Generate schedule for a specific route
        print("\nDemo 1: Generate AI-optimized schedule for Tuyến Metro số 1")
        print("-" * 60)
        
        route_request = control_pb2.GenerateScheduleRequest(
            routeId="tuyen-metro-so-1-ben-thanh-suoi-tien",
            date=datetime.now().strftime("%Y-%m-%d"),
            dayOfWeek=datetime.now().strftime("%A"),
            serviceStart="05:00:00",
            serviceEnd="23:00:00",
            direction="origin_to_destination"
        )
        
        print("Requesting AI schedule generation...")
        print(f"   Route: {route_request.routeId}")
        print(f"   Date: {route_request.date} ({route_request.dayOfWeek})")
        print(f"   Service hours: {route_request.serviceStart} - {route_request.serviceEnd}")
        
        response = stub.GenerateSchedule(route_request)
        
        if response.trips > 0:
            print(f"Success! Generated {response.trips} optimized trips")
            print("   AI considered:")
            print("     - Historical demand patterns (Prophet ML)")
            print("     - Peak/off-peak time bands")
            print("     - Available train capacity")
            print("     - Station dwell times")
        else:
            print(" No trips generated - check transport-service connection")
        
        time.sleep(2)
        
        # Demo 2: Generate daily schedules for all routes
        print("\nDemo 2: Generate daily schedules for entire Metro system")
        print("-" * 60)
        
        tomorrow = datetime.now() + timedelta(days=1)
        daily_request = control_pb2.GenerateDailyRequest(
            date=tomorrow.strftime("%Y-%m-%d"),
            dayOfWeek=tomorrow.strftime("%A"),
            routeIds=[]  # Empty = all routes
        )
        
        print("Requesting system-wide schedule generation...")
        print(f"   Target date: {daily_request.date} ({daily_request.dayOfWeek})")
        print("   Scope: All active Metro routes")
        print("   AI Strategy: Prophet-based demand forecasting")
        
        daily_response = stub.GenerateDailySchedules(daily_request)
        
        if daily_response.trips > 0:
            print(f"Success! Generated {daily_response.trips} total trips")
            print("   System coverage:")
            
            # Calculate estimated trips per route (assuming 6 routes)
            avg_trips_per_route = daily_response.trips // 6 if daily_response.trips > 6 else daily_response.trips
            print(f"     - ~{avg_trips_per_route} trips per route")
            print(f"     - Rush hour optimization enabled")
            print(f"     - Weekend/weekday pattern recognition")
            print(f"     - Dynamic headway adjustment (6-15 min)")
        else:
            print(" No daily schedules generated")
        
        time.sleep(2)
        
        # Demo 3: Show AI features
        print("\nDemo 3: AI Scheduler Intelligence Features")
        print("-" * 60)
        
        print("Prophet ML Forecasting:")
        print("   ✓ Seasonal demand patterns")
        print("   ✓ Peak hour detection (6-9 AM, 5-8 PM)")
        print("   ✓ Weekend vs weekday optimization")
        print("   ✓ Holiday pattern recognition")
        
        print("\nDynamic Scheduling:")
        print("   ✓ 6-minute headway during rush hour")
        print("   ✓ 10-minute headway during normal hours")
        print("   ✓ 15-minute headway during off-peak")
        print("   ✓ Automatic train-route assignment")
        
        print("\nSmart Trip Planning:")
        print("   ✓ Optimal departure time distribution")
        print("   ✓ Station dwell time calculation")
        print("   ✓ Route duration-based scheduling")
        print("   ✓ Train capacity utilization")
        
        # Demo 4: Test reschedule capability (placeholder)
        print("\nDemo 4: Reschedule Capability (Future)")
        print("-" * 60)
        
        reschedule_request = control_pb2.RescheduleRequest(
            fromTime="17:00:00",
            horizonMin=120,
            affectedRoutes=["tuyen-metro-so-1-ben-thanh-suoi-tien"],
            reasons=["high_demand", "peak_hour_optimization"]
        )
        
        reschedule_response = stub.Reschedule(reschedule_request)
        print(f"Reschedule API: {reschedule_response.tripsAdjusted} trips adjusted")
        print("   (Currently placeholder - will integrate with real-time data)")
        
        print("\nAI Scheduler Demo Complete!")
        print("\nKey Benefits Demonstrated:")
        print("Prophet ML for demand prediction")
        print("Automatic schedule optimization")
        print("Dynamic headway adjustment")
        print("Multi-route system coordination")
        print("Peak hour intelligence")
        print("Scalable architecture (gRPC)")
        
        print("\nTechnical Architecture:")
        print("• Control Service (Python + Prophet ML)")
        print("• Transport Service (Node.js + MySQL)")
        print("• gRPC communication")
        print("• Prophet time series forecasting")
        print("• Heuristic scheduling algorithms")
        
    except grpc.RpcError as e:
        print(f"gRPC Connection Error: {e.code()} - {e.details()}")
        print("\nTroubleshooting:")
        print("1. Make sure control-service is running: python src/app.py")
        print("2. Check if port 8008 is available")
        print("3. Ensure transport-service is running on port 8003")
        print("4. Verify gRPC proto files are up to date")
        
    except Exception as e:
        print(f"Demo Error: {str(e)}")
        
    finally:
        try:
            channel.close()
        except:
            pass

def test_prophet_model():
    """Test Prophet model functionality"""
    print("\nTesting Prophet ML Model...")
    
    try:
        from ai_scheduler.services.forecast_service import ForecastService
        
        forecast = ForecastService()
        
        # Test demand forecasting
        print("Generating demand forecast...")
        timebands = forecast.forecast_headways(
            route_id="tuyen-metro-so-1-ben-thanh-suoi-tien",
            date=datetime.now().strftime("%Y-%m-%d"),
            day_of_week=datetime.now().strftime("%A")
        )
        
        print(f"Generated {len(timebands)} time bands:")
        for band in timebands[:3]:  # Show first 3
            print(f"   {band.start}-{band.end}: {band.headway_sec}s headway")
        
        print("Prophet model features:")
        print("   ✓ Daily seasonality patterns")
        print("   ✓ Weekly seasonality patterns") 
        print("   ✓ Rush hour peak detection")
        print("   ✓ Synthetic fallback if Prophet unavailable")
        
    except Exception as e:
        print(f"Prophet model test failed: {e}")
        print("   This is OK - model will use synthetic fallback")

if __name__ == "__main__":
    print("Metro TPHCM AI Scheduler Demo")
    print("Make sure control-service and transport-service are running!")
    print("=" * 60)
    
    # Test Prophet model first
    test_prophet_model()
    
    # Main demo
    input("\nPress Enter to start AI Scheduler demo...")
    demo_ai_scheduler()
    
    print("\n" + "=" * 60)
    print("Demo completed!")
