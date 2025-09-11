const { Train, Route } = require('../models/index.model');

function parseRouteNumber(routeId) {
  const match = routeId.match(/tuyen-metro-so-(\d+)/);
  return match ? match[1].padStart(2, '0') : 'XX';
}

function chooseTypeByDuration(durationMinutes) {
  if (durationMinutes >= 60) return 'express';
  if (durationMinutes >= 30) return 'standard';
  return 'standard';
}

function capacityByType(type) {
  return type === 'express' ? 1300 : 900;
}

function computeRequiredActiveTrains(durationMinutes, headwayMinutes = 30, turnaroundMinutesEachEnd = 10) {
  const cycle = 2 * durationMinutes + 2 * turnaroundMinutesEachEnd; // minutes for round-trip + turnarounds
  const base = Math.ceil(cycle / headwayMinutes);
  // Provide generous capacity per request: triple the base requirement
  return Math.max(base, 2) * 3;
}

function buildTrainName(routeId, index) {
  const num = parseRouteNumber(routeId);
  return `Metro-${num}-${String(index).padStart(3, '0')}`;
}

function randomMaintenanceDate() {
  const base = new Date('2024-11-01T00:00:00Z').getTime();
  const span = 60 /* days */ * 24 * 3600 * 1000;
  return new Date(base + Math.floor(Math.random() * span));
}

async function generateTrainsDataFromRoutes() {
  const routes = await Route.findAll();
  const trains = [];
  for (const route of routes) {
    const routeId = route.routeId;
    const duration = Number(route.duration) || 30;
    const type = chooseTypeByDuration(duration);
    const capacity = capacityByType(type);
    const activeNeeded = computeRequiredActiveTrains(duration, 30, 10);
    // Reserve 20% in maintenance pool
    const maintenanceCount = Math.ceil(activeNeeded * 0.2);
    const total = activeNeeded + maintenanceCount;
    for (let i = 1; i <= total; i++) {
      const status = i <= activeNeeded ? 'active' : 'maintenance';
      trains.push({
        name: buildTrainName(routeId, i),
        type,
        capacity,
        routeId,
        status,
        lastMaintenance: randomMaintenanceDate(),
      });
    }
  }
  return trains;
}

const seedTrains = async () => {
  try {
    console.log('🚄 Bắt đầu seed dữ liệu tàu Metro TPHCM (tự động theo tuyến)...');

    await Train.destroy({ where: {} });

    const trainsData = await generateTrainsDataFromRoutes();

    const trains = await Train.bulkCreate(trainsData);

    console.log(`Đã tạo thành công ${trains.length} tàu Metro TPHCM`);

    const trainsByRoute = trains.reduce((acc, train) => {
      const routeId = train.routeId;
      if (!acc[routeId]) {
        acc[routeId] = [];
      }
      acc[routeId].push(train);
      return acc;
    }, {});

    console.log('\nThống kê tàu theo tuyến:');
    Object.keys(trainsByRoute).forEach(routeId => {
      const routeTrains = trainsByRoute[routeId];
      const routeName = routeId.replace(/-/g, ' ').replace(/tuyen metro so /g, 'Tuyến ').toUpperCase();
      console.log(`   🚇 ${routeName}: ${routeTrains.length} tàu (🟢 ${routeTrains.filter(t => t.status==='active').length} active, 🟡 ${routeTrains.filter(t => t.status==='maintenance').length} maintenance)`);
    });

    // Thống kê theo loại tàu
    const standardTrains = trains.filter(train => train.type === 'standard');
    const expressTrains = trains.filter(train => train.type === 'express');

    console.log('\nThống kê tàu theo loại:');
    console.log(`   Tàu tiêu chuẩn: ${standardTrains.length} tàu`);
    console.log(`   Tàu tốc hành: ${expressTrains.length} tàu`);

    console.log('\nSức chứa trung bình theo tuyến:');
    Object.keys(trainsByRoute).forEach(routeId => {
      const routeTrains = trainsByRoute[routeId];
      const avgCapacity = routeTrains.reduce((sum, train) => sum + train.capacity, 0) / routeTrains.length;
      const routeName = routeId.replace(/-/g, ' ').replace(/tuyen metro so /g, 'Tuyến ').toUpperCase();
      console.log(`    ${routeName}: ${Math.round(avgCapacity)} hành khách/tàu`);
    });

    return trains;
  } catch (error) {
    console.error('Lỗi khi seed dữ liệu tàu Metro:', error);
    throw error;
  }
};

module.exports = { seedTrains };


