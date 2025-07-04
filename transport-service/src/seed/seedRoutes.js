const { Route, Station } = require('../models/index.model');

const routesData = [
  {
    name: 'Tuyến Metro số 1 (Bến Thành - Suối Tiên)',
    originName: 'BX. Miền Đông mới',
    destinationName: 'Bến Thành',
    // numberOfStations: 14,
    distance: 19.7, // km
    duration: 36, // phút
    isActive: true
  },
  {
    name: 'Tuyến Metro số 2 (BX. An Sương Mới - Cát Lái)',
    originName: 'BX. An Sương Mới',
    destinationName: 'Cát Lái',
    // numberOfStations: 22,
    distance: 48.0, // km
    duration: 90, // phút
    isActive: true
  },
  {
    name: 'Tuyến Metro số 3a (BX. Miền Tây Mới - Bến Thành)',
    originName: 'BX. Miền Tây Mới',
    destinationName: 'Bến Thành',
    // numberOfStations: 13,
    distance: 19.8, // km
    duration: 38, // phút
    isActive: true 
  },
  {
    name: 'Tuyến Metro số 3b (Cộng Hòa - Ga Dĩ An)',
    originName: 'Cộng Hòa',
    destinationName: 'Ga Dĩ An',
    // numberOfStations: 13,
    distance: 12.1, // km
    duration: 25, // phút
    isActive: true 
  },
  {
    name: 'Tuyến Metro số 4 (Thuận An - Nhà Bè)',
    originName: 'Thuận An',
    destinationName: 'Nhà Bè',
    // numberOfStations: 23,
    distance: 36.2, // km
    duration: 70, // phút
    isActive: true 
  },
  {
    name: 'Tuyến Metro số 5 (BX. Cần Giuộc - Cầu Sài Gòn)',
    originName: 'Bến Xe Cần Giuộc',
    destinationName: 'Cầu Sài Gòn',
    // numberOfStations: 17,
    distance: 23.4, // km
    duration: 45, // phút
    isActive: true 
  },
  {
    name: 'Tuyến Metro số 6 (Quốc Lộ 1A - Cộng Hòa)',
    originName: 'Quốc Lộ 1A',
    destinationName: 'Cộng Hòa',
    // numberOfStations: 12,
    distance: 6.8, // km
    duration: 15, // phút
    isActive: true 
  }
];

const seedRoutes = async () => {
  try {    
    // Lấy tất cả stations để mapping
    const stations = await Station.findAll();
    const stationMap = {};
    stations.forEach(station => {
      stationMap[station.name] = station.stationId;
    });
    
    // Xóa dữ liệu cũ
    await Route.destroy({ where: {} });
    
    // Chuẩn bị dữ liệu routes với originId và destinationId
    const routesToCreate = routesData.map(route => {
      const originId = stationMap[route.originName];
      const destinationId = stationMap[route.destinationName];
      
      if (!originId || !destinationId) {
        throw new Error(`Không tìm thấy ga ${route.originName} hoặc ${route.destinationName}`);
      }
      
      return {
        name: route.name,
        originId: originId,
        destinationId: destinationId,
        numberOfStations: route.numberOfStations,
        distance: route.distance,
        duration: route.duration,
        isActive: route.isActive
      };
    });
    
    // Tạo routes
    const routes = await Route.bulkCreate(routesToCreate);
    
    
    return routes;
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu tuyến Metro:', error);
    throw error;
  }
};

module.exports = { seedRoutes, routesData }; 