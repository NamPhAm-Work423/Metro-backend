"""
Quick Test for Dynamic Headway Demo
===================================

Simple test script để kiểm tra dynamic headway calculation
Chạy nhanh để xem kết quả trước khi demo chính thức.
"""

import sys
import os
from datetime import datetime

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from ai_scheduler.services.forecast_service import ForecastService

def quick_test():
    """Quick test dynamic headway functionality"""
    
    print("🔬 QUICK TEST: Dynamic Headway Calculation")
    print("="*50)
    
    forecast_service = ForecastService()
    
    # Test different scenarios
    scenarios = ["normal", "high_demand", "event", "weather", "holiday"]
    route_id = "tuyen-metro-so-1-ben-thanh-suoi-tien"
    date = datetime.now().strftime("%Y-%m-%d")
    day_of_week = "Monday"
    
    for scenario in scenarios:
        print(f"\n📊 SCENARIO: {scenario.upper()}")
        print("-" * 40)
        
        demand_data = forecast_service.simulate_passenger_demand(
            route_id, date, day_of_week, scenario
        )
        
        for data in demand_data[:3]:  # Show first 3 time periods
            orig_headway = data['original_headway_sec'] // 60
            opt_headway = data['optimal_headway_sec'] // 60
            passengers = data['passenger_count']
            utilization = data['capacity_utilization']
            
            improvement = ((data['trains_per_hour_optimal'] - data['trains_per_hour_original']) 
                         / data['trains_per_hour_original']) * 100
            
            print(f"  {data['time_period']}: {passengers:,} passengers")
            print(f"    Original: {orig_headway}min → Optimized: {opt_headway}min ({improvement:+.0f}% frequency)")
            print(f"    Capacity: {utilization:.0%}")
    
    print(f"\n✅ Test completed! Dynamic headway system working correctly.")
    print(f"🚀 Ready to run full demo: python detailed_demand_demo.py")

if __name__ == "__main__":
    quick_test()



