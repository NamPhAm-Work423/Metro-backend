const sequelize = require('../config/database');
const { seedStations } = require('./seedStations');
const { seedRoutes } = require('./seedRoutes');
const { seedRouteStations } = require('./seedRouteStations');
const { seedTrains } = require('./seedTrains');

const runAllSeeds = async () => {
  try {
    console.log('🚀 Bắt đầu khởi tạo dữ liệu hệ thống Metro TPHCM...\n');

    // Kiểm tra kết nối database
    await sequelize.authenticate();
    console.log('✅ Kết nối database thành công!\n');

    // Database is already synchronized by the application startup
    // Skip additional sequelize.sync() here to avoid race conditions

    console.log('='.repeat(60));
    console.log('🌟 KHỞI TẠO DỮ LIỆU HỆ THỐNG METRO TPHCM');
    console.log('='.repeat(60));

    // Check if data already exists
    const { Route, RouteStation, Train, Station } = require('../models/index.model');
    const existingStations = await Station.count();
    const existingRoutes = await Route.count();
    
    if (existingStations > 0 && existingRoutes > 0) {
      console.log('\nDữ liệu hệ thống Metro đã tồn tại, bỏ qua việc khởi tạo...');
      console.log(`   Số ga hiện có: ${existingStations} ga`);
      console.log(`   Số tuyến hiện có: ${existingRoutes} tuyến`);
      return;
    }

    // Clear existing data in correct order (child tables first)
    console.log('\nBƯỚC 0: XÓA DỮ LIỆU CŨ');
    console.log('-'.repeat(40));
    
    // Delete in reverse dependency order
    await RouteStation.destroy({ where: {} });
    await Route.destroy({ where: {} });
    await Train.destroy({ where: {} });
    await Station.destroy({ where: {} });
    console.log('Đã xóa dữ liệu cũ');

    // Bước 1: Tạo các ga Metro
    console.log('\nBƯỚC 1: TẠO CÁC GA METRO');
    console.log('-'.repeat(40));
    const stations = await seedStations();

    // Bước 2: Tạo các tuyến Metro
    console.log('\nBƯỚC 2: TẠO CÁC TUYẾN METRO');
    console.log('-'.repeat(40));
    const routes = await seedRoutes();

    // Bước 3: Liên kết ga với tuyến
    console.log('\nBƯỚC 3: LIÊN KẾT GA VỚI TUYẾN');
    console.log('-'.repeat(40));
    const routeStations = await seedRouteStations();

    // Bước 4: Tạo các tàu Metro
    console.log('\nBƯỚC 4: TẠO CÁC TÀU METRO');
    console.log('-'.repeat(40));
    const trains = await seedTrains();

    // Hiển thị kết quả tổng hợp
    console.log('\n' + '='.repeat(60));
    console.log('HOÀN THÀNH KHỞI TẠO HỆ THỐNG METRO TPHCM');
    console.log('='.repeat(60));
    
    console.log('\nTỔNG KẾT:');
    console.log(`   Số ga Metro: ${stations.length} ga`);
    console.log(`   Số tuyến Metro: ${routes.length} tuyến`);
    console.log(`   Số liên kết ga-tuyến: ${routeStations.length} liên kết`);
    console.log(`   Số tàu Metro: ${trains.length} tàu`);

    console.log('\nCHI TIẾT HỆ THỐNG:');
    const activeRoutes = routes.filter(route => route.isActive);
    const plannedRoutes = routes.filter(route => !route.isActive);
    console.log(`   Tuyến đang hoạt động: ${activeRoutes.length} tuyến`);
    console.log(`   Tuyến đang xây dựng/lập kế hoạch: ${plannedRoutes.length} tuyến`);

    const activeTrains = trains.filter(train => train.status === 'active');
    const maintenanceTrains = trains.filter(train => train.status === 'maintenance');
    const outOfServiceTrains = trains.filter(train => train.status === 'out-of-service');
    console.log(`   🟢 Tàu đang hoạt động: ${activeTrains.length} tàu`);
    console.log(`   🟡 Tàu đang bảo trì: ${maintenanceTrains.length} tàu`);
    console.log(`   🔴 Tàu chưa vận hành: ${outOfServiceTrains.length} tàu`);

    console.log('\n✨ Hệ thống Metro TPHCM đã sẵn sàng!');
    console.log('📝 Dữ liệu được tạo dựa trên quy hoạch chính thức của TP.HCM');
    console.log('🔄 Chạy lại script này để cập nhật dữ liệu mới nhất');

  } catch (error) {
    console.error('\n❌ Lỗi khi khởi tạo dữ liệu hệ thống Metro:', error);
    throw error;
  }
};

// Chạy seed nếu file này được gọi trực tiếp
if (require.main === module) {
  runAllSeeds()
    .then(() => {
      console.log('\n🎯 Quá trình seed hoàn tất thành công!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Quá trình seed thất bại:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllSeeds,
  seedStations,
  seedRoutes,
  seedRouteStations,
  seedTrains
}; 