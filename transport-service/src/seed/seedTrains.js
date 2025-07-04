const { Train } = require('../models/index.model');
const trainsData = [
  // Tàu cho Tuyến Metro số 1 (đã vận hành)
  {
    name: 'Metro-01-001',
    type: 'standard',
    capacity: 930, // 930 hành khách (6 toa)
    status: 'active',
    lastMaintenance: new Date('2024-12-01')
  },
  {
    name: 'Metro-01-002',
    type: 'standard',
    capacity: 930,
    status: 'active',
    lastMaintenance: new Date('2024-12-02')
  },
  {
    name: 'Metro-01-003',
    type: 'standard',
    capacity: 930,
    status: 'active',
    lastMaintenance: new Date('2024-12-03')
  },
  {
    name: 'Metro-01-004',
    type: 'standard',
    capacity: 930,
    status: 'active',
    lastMaintenance: new Date('2024-12-04')
  },
  {
    name: 'Metro-01-005',
    type: 'standard',
    capacity: 930,
    status: 'active',
    lastMaintenance: new Date('2024-12-05')
  },
  {
    name: 'Metro-01-006',
    type: 'standard',
    capacity: 930,
    status: 'active',
    lastMaintenance: new Date('2024-12-06')
  },
  {
    name: 'Metro-01-007',
    type: 'standard',
    capacity: 930,
    status: 'maintenance',
    lastMaintenance: new Date('2024-12-07')
  },
  {
    name: 'Metro-01-008',
    type: 'standard',
    capacity: 930,
    status: 'active',
    lastMaintenance: new Date('2024-12-08')
  },
  {
    name: 'Metro-01-009',
    type: 'standard',
    capacity: 930,
    status: 'active',
    lastMaintenance: new Date('2024-12-09')
  },
  {
    name: 'Metro-01-010',
    type: 'standard',
    capacity: 930,
    status: 'active',
    lastMaintenance: new Date('2024-12-10')
  },

  // Tàu cho Tuyến Metro số 2 (đang chuẩn bị)
  {
    name: 'Metro-02-001',
    type: 'express',
    capacity: 1200, // Tàu lớn hơn cho tuyến dài
    status: 'active', // Chưa đưa vào vận hành
    lastMaintenance: null
  },
  {
    name: 'Metro-02-002',
    type: 'express',
    capacity: 1200,
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-02-003',
    type: 'express',
    capacity: 1200,
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-02-004',
    type: 'express',
    capacity: 1200,
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-02-005',
    type: 'express',
    capacity: 1200,
    status: 'active',
    lastMaintenance: null
  },

  // Tàu cho Tuyến Metro số 3A
  {
    name: 'Metro-3A-001',
    type: 'standard',
    capacity: 800,
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-3A-002',
    type: 'standard',
    capacity: 800,
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-3A-003',
    type: 'standard',
    capacity: 800,
    status: 'active',
    lastMaintenance: null
  },

  // Tàu cho Tuyến Metro số 3B (kết nối sân bay)
  {
    name: 'Metro-3B-001',
    type: 'express',
    capacity: 600, // Tàu nhỏ hơn cho tuyến ngắn nhưng nhanh
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-3B-002',
    type: 'express',
    capacity: 600,
    status: 'active',
    lastMaintenance: null
  },

  // Tàu cho Tuyến Metro số 4 (tuyến dài nhất)
  {
    name: 'Metro-04-001',
    type: 'express',
    capacity: 1400, // Tàu lớn nhất cho tuyến dài nhất
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-04-002',
    type: 'express',
    capacity: 1400,
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-04-003',
    type: 'express',
    capacity: 1400,
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-04-004',
    type: 'express',
    capacity: 1400,
    status: 'active',
    lastMaintenance: null
  },

  // Tàu cho Tuyến Metro số 4B (tuyến ngắn kết nối sân bay)
  {
    name: 'Metro-4B-001',
    type: 'standard',
    capacity: 400,
    status: 'active',
    lastMaintenance: null
  },

  // Tàu cho Tuyến Metro số 5
  {
    name: 'Metro-05-001',
    type: 'standard',
    capacity: 1000,
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-05-002',
    type: 'standard',
    capacity: 1000,
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-05-003',
    type: 'standard',
    capacity: 1000,
    status: 'active',
    lastMaintenance: null
  },

  // Tàu cho Tuyến Metro số 6 (toàn ngầm)
  {
    name: 'Metro-06-001',
    type: 'standard',
    capacity: 700,
    status: 'active',
    lastMaintenance: null
  },
  {
    name: 'Metro-06-002',
    type: 'standard',
    capacity: 700,
    status: 'active',
    lastMaintenance: null
  }
];

const seedTrains = async () => {
  try {
    console.log('🚄 Bắt đầu seed dữ liệu tàu Metro TPHCM...');
    
    // Xóa dữ liệu cũ
    await Train.destroy({ where: {} });
    
    // Tạo trains
    const trains = await Train.bulkCreate(trainsData);
    
    console.log(`✅ Đã tạo thành công ${trains.length} tàu Metro TPHCM`);
    
    // Thống kê theo trạng thái
    const activeTrains = trains.filter(train => train.status === 'active');
    const maintenanceTrains = trains.filter(train => train.status === 'maintenance');
    const outOfServiceTrains = trains.filter(train => train.status === 'active');
    
    console.log('\n📊 Thống kê tàu theo trạng thái:');
    console.log(`   🟢 Đang hoạt động: ${activeTrains.length} tàu`);
    console.log(`   🟡 Đang bảo trì: ${maintenanceTrains.length} tàu`);
    console.log(`   🔴 Chưa vận hành: ${outOfServiceTrains.length} tàu`);
    
    // Thống kê theo loại tàu
    const standardTrains = trains.filter(train => train.type === 'standard');
    const expressTrains = trains.filter(train => train.type === 'express');
    
    console.log('\n🚇 Thống kê tàu theo loại:');
    console.log(`   🚊 Tàu tiêu chuẩn: ${standardTrains.length} tàu`);
    console.log(`   🚅 Tàu tốc hành: ${expressTrains.length} tàu`);
    
    // Hiển thị tàu đang hoạt động (Tuyến số 1)
    console.log('\n🟢 Tàu đang hoạt động (Tuyến Metro số 1):');
    activeTrains.forEach((train, index) => {
      console.log(`   ${index + 1}. ${train.name} - Sức chứa: ${train.capacity} hành khách`);
    });
    
    if (maintenanceTrains.length > 0) {
      console.log('\n🟡 Tàu đang bảo trì:');
      maintenanceTrains.forEach((train, index) => {
        console.log(`   ${index + 1}. ${train.name} - Sức chứa: ${train.capacity} hành khách`);
      });
    }
    
    return trains;
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu tàu Metro:', error);
    throw error;
  }
};

module.exports = { seedTrains, trainsData }; 