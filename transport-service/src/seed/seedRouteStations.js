const { RouteStation, Route, Station } = require('../models/index.model');
// Định nghĩa thứ tự các ga trên từng tuyến Metro
const routeStationsData = {
  'Tuyến Metro số 1 (Bến Thành - Suối Tiên)': [
    'BX. Miền Đông mới',
    'Suối Tiên',
    'Công nghệ cao',
    'Thủ Đức',
    'Bình Thái',
    'Phước Long',
    'Rạch Chiếc',
    'An Phú',
    'Thảo Điền',
    'Cầu Sài Gòn', //Connect M5
    'Văn Thánh',
    'Ba Son',
    'Nhà hát',
    'Bến Thành'   //Big Station
  ],
  
  'Tuyến Metro số 2 (BX. An Sương Mới - Cát Lái)': [
    'BX. An Sương Mới',
    'Tân Thới Nhất',
    'Tham Lương',
    'Phạm Văn Bạch',
    'Bà Quẹo',
    'Nguyễn Hồng Đào',
    'Đồng Đen',
    'Bảy Hiền',   //Connect M5
    'Phạm Văn Hai',
    'Lê Thị Riêng',
    'Hòa Hưng',
    'Dân Chủ',
    'Tao Đàn',  //Connect M3a
    'Bến Thành',  //Big Station
    'Mễ Linh',
    'Quảng Trường Thủ Thiêm',
    'Trần Não',
    'Bình Khánh',
    'Ga Thủ Thiêm',
    'Bình Trưng',
    'Đồng Văn Cống',
    'Cát Lái'
  ],
  
  'Tuyến Metro số 3a (BX. Miền Tây Mới - Bến Thành)': [
    'BX. Miền Tây Mới',
    'Tân Kiệt',
    'An Lạc',
    'Công Viên Phú Lâm',
    'Phú Lâm',
    'Cây Gõ',
    'Chợ Lớn',
    'Thuận Kiều', //Connect M5
    'Văn Lang',
    'An Đông',
    'Cộng Hòa', //Connect M6
    '23 Tháng 9', 
    'Bến Thành'  //Big Station
  ],

  'Tuyến Metro số 3b (Cộng Hòa - Ga Dĩ An)': [
    'Cộng Hòa', //Connect M3a, M6
    'Tao Đàn', //Connect M2
    'Dinh Độc Lập',
    'Hồ Con Rùa', //Connect M4
    'Thảo Cầm Viên', 
    'Thị Nghè',
    'Hàng Xanh', //Connect M5
    'Xô Viết Nghệ Tĩnh',
    'Bình Triệu',
    'Hiệp Bình Phước',
    'Tam Bình – Gò Dưa',
    'Sóng Thần',
    'Ga Dĩ An'
  ],
  
  'Tuyến Metro số 4 (Thuận An - Nhà Bè)': [
    'Thuận An',
    'Lái Thiêu',
    'Phú Long',
    'Thạnh Lộc',
    'Thạnh Xuân',
    'Xóm Mới',
    'Bệnh Viện Gò Vấp',
    'Nguyễn Văn Lượng',
    'Quang Trung',
    'Công Viên Gia Định',
    'Nguyễn Kiệm',
    'Phú Nhuận', //Connect M5
    'Cầu Kiệu',
    'Công Viên Lê Văn Tám',
    'Hồ Con Rùa', //Connect M3b
    'Bến Thành', //Big Station
    'Khánh Hội',
    'Tân Hưng',
    'Nguyễn Văn Linh',
    'Hồ Bán Nguyệt',
    'Nam Sài Gòn',
    'Phú Mỹ',
    'Nhà Bè'
  ],
  
  'Tuyến Metro số 5 (BX. Cần Giuộc - Cầu Sài Gòn)': [
    'Bến Xe Cần Giuộc',
    'Bình Hưng',
    'Tạ Quang Bửu',
    'Xóm Cùi',
    'Thuận Kiều', //Connect M3a
    'Phú Thọ',
    'Bách Khoa',
    'Bắc Hải',
    'Chợ Tân Bình',
    'Bảy Hiền', //Connect M2
    'Lăng Cha Cả',
    'Hoàng Văn Thụ',
    'Phú Nhuận', //Connect M4
    'Nguyễn Văn Đậu',
    'Bà Chiểu',
    'Hàng Xanh', //Connect M3b
    'Cầu Sài Gòn' //Connect M1
  ],
  
  'Tuyến Metro số 6 (Quốc Lộ 1A - Cộng Hòa)': [
    'Quốc Lộ 1A',
    'Bình Hưng Hòa',
    'Sơn Kỳ',
    'Nguyễn Sơn',
    'Bốn Xã',
    'Hòa Bình',
    'Đầm Sen',
    'Lãnh Binh Thăng',
    'Phú Thọ', //Connect M5
    'Thành Thái',
    'Lý Thái Tổ',
    'Cộng Hòa' //Connect M3a
  ]
};

const seedRouteStations = async () => {
  try {
    console.log('🔗 Bắt đầu seed dữ liệu liên kết ga-tuyến Metro TPHCM...');
    
    // Lấy tất cả routes và stations
    const routes = await Route.findAll();
    const stations = await Station.findAll();
    
    // Tạo maps để tra cứu nhanh
    const routeMap = {};
    routes.forEach(route => {
      routeMap[route.name] = route.routeId;
    });
    
    const stationMap = {};
    stations.forEach(station => {
      stationMap[station.name] = station.stationId;
    });
    
    // Xóa dữ liệu cũ
    await RouteStation.destroy({ where: {} });
    
    const routeStationsToCreate = [];
    
    // Tạo dữ liệu RouteStation cho từng tuyến
    for (const [routeName, stationNames] of Object.entries(routeStationsData)) {
      const routeId = routeMap[routeName];
      
      if (!routeId) {
        console.warn(`⚠️  Không tìm thấy tuyến: ${routeName}`);
        continue;
      }
      
      stationNames.forEach((stationName, index) => {
        const stationId = stationMap[stationName];
        
        if (!stationId) {
          console.warn(`⚠️  Không tìm thấy ga: ${stationName} cho tuyến ${routeName}`);
          return;
        }
        
        routeStationsToCreate.push({
          routeId: routeId,
          stationId: stationId,
          sequence: index + 1
        });
      });
    }
    
    // Bulk create route stations
    const routeStations = await RouteStation.bulkCreate(routeStationsToCreate);
    
    const affectedRouteIds = [...new Set(routeStations.map(rs => rs.routeId))];
    for (const routeId of affectedRouteIds) {
      const count = await RouteStation.count({ where: { routeId } });
      await Route.update({ numberOfStations: count }, { where: { routeId }, hooks: false });
    }
    
    console.log(`✅ Đã tạo thành công ${routeStations.length} liên kết ga-tuyến`);
    console.log('🗺️  Chi tiết các tuyến và ga:');
    
    // Hiển thị kết quả theo từng tuyến
    for (const [routeName, stationNames] of Object.entries(routeStationsData)) {
      console.log(`\n📍 ${routeName}:`);
      stationNames.forEach((stationName, index) => {
        console.log(`   ${index + 1}. ${stationName}`);
      });
    }
    
    return routeStations;
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu liên kết ga-tuyến:', error);
    throw error;
  }
};

module.exports = { seedRouteStations, routeStationsData }; 