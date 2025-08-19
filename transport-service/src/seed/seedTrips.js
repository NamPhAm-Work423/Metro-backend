const { Trip, Route, Train } = require('../models/index.model');

// Hàm tính toán thời gian đến dựa trên thời gian khởi hành và duration
function calculateArrivalTime(departureTime, durationMinutes) {
  const [hours, minutes] = departureTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const arrivalHours = Math.floor(totalMinutes / 60) % 24;
  const arrivalMins = totalMinutes % 60;
  return `${arrivalHours.toString().padStart(2, '0')}:${arrivalMins.toString().padStart(2, '0')}:00`;
}

// Hàm tạo lịch trình theo tần suất (mỗi X phút)
function generateSchedule(startTime, endTime, intervalMinutes, durationMinutes) {
  const trips = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentTime = startHour * 60 + startMin; // Convert to minutes
  const endTimeMinutes = endHour * 60 + endMin;
  
  while (currentTime < endTimeMinutes) {
    const hours = Math.floor(currentTime / 60);
    const minutes = currentTime % 60;
    const departureTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    const arrivalTime = calculateArrivalTime(departureTime, durationMinutes);
    
    trips.push({
      departureTime,
      arrivalTime
    });
    
    currentTime += intervalMinutes;
  }
  
  return trips;
}

// Cấu hình lịch trình cho từng tuyến
const routeScheduleConfig = {
  'tuyen-metro-so-1-ben-thanh-suoi-tien': {
    duration: 36, // phút
    weekdayInterval: 6, // mỗi 6 phút (giờ cao điểm)
    weekendInterval: 10, // mỗi 10 phút (cuối tuần)
    rushHourInterval: 4, // mỗi 4 phút (6-9h, 17-20h)
    operatingHours: { start: '05:00', end: '23:00' }
  },
  'tuyen-metro-so-2-bx-an-suong-moi-cat-lai': {
    duration: 90, // phút  
    weekdayInterval: 8, // mỗi 8 phút
    weekendInterval: 12, // mỗi 12 phút
    rushHourInterval: 6, // mỗi 6 phút
    operatingHours: { start: '05:00', end: '23:00' }
  },
  'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh': {
    duration: 38, // phút
    weekdayInterval: 7, // mỗi 7 phút
    weekendInterval: 10, // mỗi 10 phút
    rushHourInterval: 5, // mỗi 5 phút
    operatingHours: { start: '05:00', end: '23:00' }
  },
  'tuyen-metro-so-3b-cong-hoa-ga-di-an': {
    duration: 25, // phút
    weekdayInterval: 10, // mỗi 10 phút (tuyến ngắn)
    weekendInterval: 15, // mỗi 15 phút
    rushHourInterval: 8, // mỗi 8 phút
    operatingHours: { start: '05:30', end: '22:30' }
  },
  'tuyen-metro-so-4-thuan-an-nha-be': {
    duration: 70, // phút
    weekdayInterval: 8, // mỗi 8 phút
    weekendInterval: 12, // mỗi 12 phút
    rushHourInterval: 6, // mỗi 6 phút
    operatingHours: { start: '05:00', end: '23:00' }
  },
  'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon': {
    duration: 45, // phút
    weekdayInterval: 10, // mỗi 10 phút
    weekendInterval: 15, // mỗi 15 phút
    rushHourInterval: 8, // mỗi 8 phút
    operatingHours: { start: '05:00', end: '22:30' }
  },
  'tuyen-metro-so-6-quoc-lo-1a-cong-hoa': {
    duration: 15, // phút (tuyến ngắn nhất)
    weekdayInterval: 8, // mỗi 8 phút
    weekendInterval: 12, // mỗi 12 phút
    rushHourInterval: 6, // mỗi 6 phút
    operatingHours: { start: '05:30', end: '22:30' }
  }
};

const seedTrips = async () => {
  try {
    console.log('🚇 Bắt đầu seed dữ liệu trips (lịch trình) Metro TPHCM...');
    
    // Xóa dữ liệu trips cũ
    await Trip.destroy({ where: {} });
    
    // Lấy tất cả routes và trains
    const routes = await Route.findAll();
    const trains = await Train.findAll({ where: { status: 'active' } });
    
    const routeMap = {};
    routes.forEach(route => {
      routeMap[route.routeId] = route;
    });
    
    const trainsByRoute = {};
    trains.forEach(train => {
      if (!trainsByRoute[train.routeId]) {
        trainsByRoute[train.routeId] = [];
      }
      trainsByRoute[train.routeId].push(train);
    });
    
    console.log('📋 Tạo lịch trình cho từng tuyến...\n');
    
    const allTrips = [];
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Tạo trips cho từng route
    for (const routeId of Object.keys(routeScheduleConfig)) {
      const config = routeScheduleConfig[routeId];
      const routeTrains = trainsByRoute[routeId] || [];
      
      if (routeTrains.length === 0) {
        console.log(`⚠️  Không có tàu active cho tuyến ${routeId}`);
        continue;
      }
      
      console.log(`🚄 Tạo lịch trình cho ${routeId}:`);
      console.log(`   📊 Số tàu khả dụng: ${routeTrains.length}`);
      
      // Tạo lịch trình cho từng ngày trong tuần
      for (const dayOfWeek of daysOfWeek) {
        const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';
        
        // Tạo lịch trình cho giờ bình thường
        const normalHourTrips = generateSchedule(
          config.operatingHours.start,
          config.operatingHours.end,
          isWeekend ? config.weekendInterval : config.weekdayInterval,
          config.duration
        );
        
        // Tạo lịch trình giờ cao điểm (chỉ cho ngày thường)
        let rushHourTrips = [];
        if (!isWeekend) {
          // Giờ cao điểm sáng: 6:00-9:00
          const morningRushTrips = generateSchedule(
            '06:00',
            '09:00',
            config.rushHourInterval,
            config.duration
          );
          
          // Giờ cao điểm chiều: 17:00-20:00  
          const eveningRushTrips = generateSchedule(
            '17:00',
            '20:00',
            config.rushHourInterval,
            config.duration
          );
          
          rushHourTrips = [...morningRushTrips, ...eveningRushTrips];
        }
        
        // Kết hợp tất cả trips và loại bỏ duplicate
        const allDayTrips = [...normalHourTrips, ...rushHourTrips];
        const uniqueTrips = allDayTrips.filter((trip, index, self) =>
          index === self.findIndex(t => t.departureTime === trip.departureTime)
        );
        
        // Sắp xếp theo thời gian
        uniqueTrips.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
        
        // Phân chia trips cho các tàu
        let trainIndex = 0;
        for (const trip of uniqueTrips) {
          const assignedTrain = routeTrains[trainIndex % routeTrains.length];
          
          allTrips.push({
            serviceDate: new Date('2024-12-20'), // Ngày mẫu
            routeId: routeId,
            trainId: assignedTrain.trainId,
            departureTime: trip.departureTime,
            arrivalTime: trip.arrivalTime,
            dayOfWeek: dayOfWeek,
            isActive: true
          });
          
          trainIndex++;
        }
        
        console.log(`   📅 ${dayOfWeek}: ${uniqueTrips.length} chuyến`);
      }
      
      console.log(''); // Dòng trống
    }
    
    // Tạo trips trong database
    console.log('💾 Lưu trips vào database...');
    const trips = await Trip.bulkCreate(allTrips);
    
    console.log(`✅ Đã tạo thành công ${trips.length} trips (lịch trình)`);
    
    // Thống kê chi tiết
    const tripsByRoute = trips.reduce((acc, trip) => {
      if (!acc[trip.routeId]) {
        acc[trip.routeId] = [];
      }
      acc[trip.routeId].push(trip);
      return acc;
    }, {});
    
    console.log('\n📊 Thống kê trips theo tuyến:');
    Object.keys(tripsByRoute).forEach(routeId => {
      const routeTrips = tripsByRoute[routeId];
      const uniqueDays = [...new Set(routeTrips.map(t => t.dayOfWeek))];
      const avgTripsPerDay = Math.round(routeTrips.length / uniqueDays.length);
      const routeName = routeId.replace(/-/g, ' ').replace(/tuyen metro so /g, 'Tuyến ').toUpperCase();
      
      console.log(`   🚇 ${routeName}:`);
      console.log(`      📈 Tổng: ${routeTrips.length} trips`);
      console.log(`      📅 Trung bình: ${avgTripsPerDay} trips/ngày`);
    });
    
    // Thống kê theo ngày trong tuần
    const tripsByDay = trips.reduce((acc, trip) => {
      if (!acc[trip.dayOfWeek]) {
        acc[trip.dayOfWeek] = [];
      }
      acc[trip.dayOfWeek].push(trip);
      return acc;
    }, {});
    
    console.log('\n📅 Thống kê trips theo ngày:');
    daysOfWeek.forEach(day => {
      const dayTrips = tripsByDay[day] || [];
      console.log(`   ${day}: ${dayTrips.length} trips`);
    });
    
    // Thống kê giờ cao điểm vs bình thường
    const morningRushTrips = trips.filter(trip => {
      const hour = parseInt(trip.departureTime.split(':')[0]);
      return hour >= 6 && hour <= 9 && !['Saturday', 'Sunday'].includes(trip.dayOfWeek);
    });
    
    const eveningRushTrips = trips.filter(trip => {
      const hour = parseInt(trip.departureTime.split(':')[0]);
      return hour >= 17 && hour <= 20 && !['Saturday', 'Sunday'].includes(trip.dayOfWeek);
    });
    
    console.log('\n⏰ Thống kê giờ cao điểm:');
    console.log(`   🌅 Giờ cao điểm sáng (6-9h): ${morningRushTrips.length} trips`);
    console.log(`   🌆 Giờ cao điểm chiều (17-20h): ${eveningRushTrips.length} trips`);
    console.log(`   📊 Tổng giờ cao điểm: ${morningRushTrips.length + eveningRushTrips.length} trips`);
    
    return trips;
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu trips Metro:', error);
    throw error;
  }
};

module.exports = { seedTrips };
