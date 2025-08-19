const { Train } = require('../models/index.model');

const trainsData = [
  // ===============================
  // TUYẾN METRO SỐ 1 (Bến Thành - Suối Tiên) - 19.7km
  // ===============================
  {
    name: 'Metro-01-001',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-12-01')
  },
  {
    name: 'Metro-01-002',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-12-02')
  },
  {
    name: 'Metro-01-003',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-12-03')
  },
  {
    name: 'Metro-01-004',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-12-04')
  },
  {
    name: 'Metro-01-005',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-12-05')
  },
  {
    name: 'Metro-01-006',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-12-06')
  },
  {
    name: 'Metro-01-007',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'maintenance',
    lastMaintenance: new Date('2024-12-07')
  },
  {
    name: 'Metro-01-008',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-12-08')
  },
  {
    name: 'Metro-01-009',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-12-09')
  },
  {
    name: 'Metro-01-010',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-12-10')
  },
  {
    name: 'Metro-01-011',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-11-25')
  },
  {
    name: 'Metro-01-012',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-11-26')
  },
  {
    name: 'Metro-01-013',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-11-27')
  },
  {
    name: 'Metro-01-014',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'active',
    lastMaintenance: new Date('2024-11-28')
  },
  {
    name: 'Metro-01-015',
    type: 'standard',
    capacity: 930,
    routeId: 'tuyen-metro-so-1-ben-thanh-suoi-tien',
    status: 'maintenance',
    lastMaintenance: new Date('2024-12-11')
  },

  // ===============================
  // TUYẾN METRO SỐ 2 (BX. An Sương Mới - Cát Lái) - 48km
  // ===============================
  {
    name: 'Metro-02-001',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-11-15')
  },
  {
    name: 'Metro-02-002',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-11-16')
  },
  {
    name: 'Metro-02-003',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-11-17')
  },
  {
    name: 'Metro-02-004',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-11-18')
  },
  {
    name: 'Metro-02-005',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-11-19')
  },
  {
    name: 'Metro-02-006',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-11-20')
  },
  {
    name: 'Metro-02-007',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-11-21')
  },
  {
    name: 'Metro-02-008',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-11-22')
  },
  {
    name: 'Metro-02-009',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'maintenance',
    lastMaintenance: new Date('2024-12-12')
  },
  {
    name: 'Metro-02-010',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-11-24')
  },
  {
    name: 'Metro-02-011',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-11-29')
  },
  {
    name: 'Metro-02-012',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-11-30')
  },
  {
    name: 'Metro-02-013',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-12-01')
  },
  {
    name: 'Metro-02-014',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-12-02')
  },
  {
    name: 'Metro-02-015',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-12-03')
  },
  {
    name: 'Metro-02-016',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-12-04')
  },
  {
    name: 'Metro-02-017',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'active',
    lastMaintenance: new Date('2024-12-05')
  },
  {
    name: 'Metro-02-018',
    type: 'express',
    capacity: 1200,
    routeId: 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
    status: 'maintenance',
    lastMaintenance: new Date('2024-12-13')
  },

  // ===============================
  // TUYẾN METRO SỐ 3A (BX. Miền Tây Mới - Bến Thành) - 19.8km
  // ===============================
  {
    name: 'Metro-3A-001',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'active',
    lastMaintenance: new Date('2024-11-10')
  },
  {
    name: 'Metro-3A-002',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'active',
    lastMaintenance: new Date('2024-11-11')
  },
  {
    name: 'Metro-3A-003',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'active',
    lastMaintenance: new Date('2024-11-12')
  },
  {
    name: 'Metro-3A-004',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'active',
    lastMaintenance: new Date('2024-11-13')
  },
  {
    name: 'Metro-3A-005',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'active',
    lastMaintenance: new Date('2024-11-14')
  },
  {
    name: 'Metro-3A-006',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'active',
    lastMaintenance: new Date('2024-11-15')
  },
  {
    name: 'Metro-3A-007',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'active',
    lastMaintenance: new Date('2024-11-16')
  },
  {
    name: 'Metro-3A-008',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'maintenance',
    lastMaintenance: new Date('2024-12-14')
  },
  {
    name: 'Metro-3A-009',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'active',
    lastMaintenance: new Date('2024-11-18')
  },
  {
    name: 'Metro-3A-010',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'active',
    lastMaintenance: new Date('2024-11-19')
  },
  {
    name: 'Metro-3A-011',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'active',
    lastMaintenance: new Date('2024-11-20')
  },
  {
    name: 'Metro-3A-012',
    type: 'standard',
    capacity: 800,
    routeId: 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
    status: 'active',
    lastMaintenance: new Date('2024-11-21')
  },

  // ===============================
  // TUYẾN METRO SỐ 3B (Cộng Hòa - Ga Dĩ An) - 12.1km
  // ===============================
  {
    name: 'Metro-3B-001',
    type: 'express',
    capacity: 600,
    routeId: 'tuyen-metro-so-3b-cong-hoa-ga-di-an',
    status: 'active',
    lastMaintenance: new Date('2024-11-05')
  },
  {
    name: 'Metro-3B-002',
    type: 'express',
    capacity: 600,
    routeId: 'tuyen-metro-so-3b-cong-hoa-ga-di-an',
    status: 'active',
    lastMaintenance: new Date('2024-11-06')
  },
  {
    name: 'Metro-3B-003',
    type: 'express',
    capacity: 600,
    routeId: 'tuyen-metro-so-3b-cong-hoa-ga-di-an',
    status: 'active',
    lastMaintenance: new Date('2024-11-07')
  },
  {
    name: 'Metro-3B-004',
    type: 'express',
    capacity: 600,
    routeId: 'tuyen-metro-so-3b-cong-hoa-ga-di-an',
    status: 'active',
    lastMaintenance: new Date('2024-11-08')
  },
  {
    name: 'Metro-3B-005',
    type: 'express',
    capacity: 600,
    routeId: 'tuyen-metro-so-3b-cong-hoa-ga-di-an',
    status: 'active',
    lastMaintenance: new Date('2024-11-09')
  },
  {
    name: 'Metro-3B-006',
    type: 'express',
    capacity: 600,
    routeId: 'tuyen-metro-so-3b-cong-hoa-ga-di-an',
    status: 'maintenance',
    lastMaintenance: new Date('2024-12-15')
  },
  {
    name: 'Metro-3B-007',
    type: 'express',
    capacity: 600,
    routeId: 'tuyen-metro-so-3b-cong-hoa-ga-di-an',
    status: 'active',
    lastMaintenance: new Date('2024-11-11')
  },
  {
    name: 'Metro-3B-008',
    type: 'express',
    capacity: 600,
    routeId: 'tuyen-metro-so-3b-cong-hoa-ga-di-an',
    status: 'active',
    lastMaintenance: new Date('2024-11-12')
  },

  // ===============================
  // TUYẾN METRO SỐ 4 (Thuận An - Nhà Bè) - 36.2km
  // ===============================
  {
    name: 'Metro-04-001',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-10-25')
  },
  {
    name: 'Metro-04-002',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-10-26')
  },
  {
    name: 'Metro-04-003',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-10-27')
  },
  {
    name: 'Metro-04-004',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-10-28')
  },
  {
    name: 'Metro-04-005',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-10-29')
  },
  {
    name: 'Metro-04-006',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-10-30')
  },
  {
    name: 'Metro-04-007',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-10-31')
  },
  {
    name: 'Metro-04-008',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-11-01')
  },
  {
    name: 'Metro-04-009',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-11-02')
  },
  {
    name: 'Metro-04-010',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'maintenance',
    lastMaintenance: new Date('2024-12-16')
  },
  {
    name: 'Metro-04-011',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-11-04')
  },
  {
    name: 'Metro-04-012',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-11-05')
  },
  {
    name: 'Metro-04-013',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-11-06')
  },
  {
    name: 'Metro-04-014',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-11-07')
  },
  {
    name: 'Metro-04-015',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-11-08')
  },
  {
    name: 'Metro-04-016',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-11-09')
  },
  {
    name: 'Metro-04-017',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-11-10')
  },
  {
    name: 'Metro-04-018',
    type: 'express',
    capacity: 1400,
    routeId: 'tuyen-metro-so-4-thuan-an-nha-be',
    status: 'active',
    lastMaintenance: new Date('2024-11-11')
  },

  // ===============================
  // TUYẾN METRO SỐ 5 (BX. Cần Giuộc - Cầu Sài Gòn) - 23.4km
  // ===============================
  {
    name: 'Metro-05-001',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-15')
  },
  {
    name: 'Metro-05-002',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-16')
  },
  {
    name: 'Metro-05-003',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-17')
  },
  {
    name: 'Metro-05-004',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-18')
  },
  {
    name: 'Metro-05-005',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-19')
  },
  {
    name: 'Metro-05-006',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-20')
  },
  {
    name: 'Metro-05-007',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-21')
  },
  {
    name: 'Metro-05-008',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'maintenance',
    lastMaintenance: new Date('2024-12-17')
  },
  {
    name: 'Metro-05-009',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-23')
  },
  {
    name: 'Metro-05-010',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-24')
  },
  {
    name: 'Metro-05-011',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-25')
  },
  {
    name: 'Metro-05-012',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-26')
  },
  {
    name: 'Metro-05-013',
    type: 'standard',
    capacity: 1000,
    routeId: 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
    status: 'active',
    lastMaintenance: new Date('2024-10-27')
  },

  // ===============================
  // TUYẾN METRO SỐ 6 (Quốc Lộ 1A - Cộng Hòa) - 6.8km
  // ===============================
  {
    name: 'Metro-06-001',
    type: 'standard',
    capacity: 700,
    routeId: 'tuyen-metro-so-6-quoc-lo-1a-cong-hoa',
    status: 'active',
    lastMaintenance: new Date('2024-11-01')
  },
  {
    name: 'Metro-06-002',
    type: 'standard',
    capacity: 700,
    routeId: 'tuyen-metro-so-6-quoc-lo-1a-cong-hoa',
    status: 'active',
    lastMaintenance: new Date('2024-11-02')
  },
  {
    name: 'Metro-06-003',
    type: 'standard',
    capacity: 700,
    routeId: 'tuyen-metro-so-6-quoc-lo-1a-cong-hoa',
    status: 'active',
    lastMaintenance: new Date('2024-11-03')
  },
  {
    name: 'Metro-06-004',
    type: 'standard',
    capacity: 700,
    routeId: 'tuyen-metro-so-6-quoc-lo-1a-cong-hoa',
    status: 'active',
    lastMaintenance: new Date('2024-11-04')
  },
  {
    name: 'Metro-06-005',
    type: 'standard',
    capacity: 700,
    routeId: 'tuyen-metro-so-6-quoc-lo-1a-cong-hoa',
    status: 'active',
    lastMaintenance: new Date('2024-11-05')
  },
  {
    name: 'Metro-06-006',
    type: 'standard',
    capacity: 700,
    routeId: 'tuyen-metro-so-6-quoc-lo-1a-cong-hoa',
    status: 'maintenance',
    lastMaintenance: new Date('2024-12-18')
  },
  {
    name: 'Metro-06-007',
    type: 'standard',
    capacity: 700,
    routeId: 'tuyen-metro-so-6-quoc-lo-1a-cong-hoa',
    status: 'active',
    lastMaintenance: new Date('2024-11-07')
  },
  {
    name: 'Metro-06-008',
    type: 'standard',
    capacity: 700,
    routeId: 'tuyen-metro-so-6-quoc-lo-1a-cong-hoa',
    status: 'active',
    lastMaintenance: new Date('2024-11-08')
  }
];

const seedTrains = async () => {
  try {
    console.log('🚄 Bắt đầu seed dữ liệu tàu Metro TPHCM mở rộng...');
    
    // Xóa dữ liệu cũ
    await Train.destroy({ where: {} });
    
    // Tạo trains
    const trains = await Train.bulkCreate(trainsData);
    
    console.log(`✅ Đã tạo thành công ${trains.length} tàu Metro TPHCM`);
    
    // Thống kê theo tuyến
    const trainsByRoute = trains.reduce((acc, train) => {
      const routeId = train.routeId;
      if (!acc[routeId]) {
        acc[routeId] = [];
      }
      acc[routeId].push(train);
      return acc;
    }, {});
    
    console.log('\n📊 Thống kê tàu theo tuyến:');
    Object.keys(trainsByRoute).forEach(routeId => {
      const routeTrains = trainsByRoute[routeId];
      const routeName = routeId.replace(/-/g, ' ').replace(/tuyen metro so /g, 'Tuyến ').toUpperCase();
      console.log(`   🚇 ${routeName}: ${routeTrains.length} tàu`);
    });
    
    // Thống kê theo trạng thái
    const activeTrains = trains.filter(train => train.status === 'active');
    const maintenanceTrains = trains.filter(train => train.status === 'maintenance');
    
    console.log('\n🔧 Thống kê tàu theo trạng thái:');
    console.log(`   🟢 Đang hoạt động: ${activeTrains.length} tàu`);
    console.log(`   🟡 Đang bảo trì: ${maintenanceTrains.length} tàu`);
    
    // Thống kê theo loại tàu
    const standardTrains = trains.filter(train => train.type === 'standard');
    const expressTrains = trains.filter(train => train.type === 'express');
    
    console.log('\n🚊 Thống kê tàu theo loại:');
    console.log(`   🚊 Tàu tiêu chuẩn: ${standardTrains.length} tàu`);
    console.log(`   🚅 Tàu tốc hành: ${expressTrains.length} tàu`);
    
    // Thống kê sức chứa trung bình theo tuyến
    console.log('\n💺 Sức chứa trung bình theo tuyến:');
    Object.keys(trainsByRoute).forEach(routeId => {
      const routeTrains = trainsByRoute[routeId];
      const avgCapacity = routeTrains.reduce((sum, train) => sum + train.capacity, 0) / routeTrains.length;
      const routeName = routeId.replace(/-/g, ' ').replace(/tuyen metro so /g, 'Tuyến ').toUpperCase();
      console.log(`   📈 ${routeName}: ${Math.round(avgCapacity)} hành khách/tàu`);
    });
    
    return trains;
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu tàu Metro:', error);
    throw error;
  }
};

module.exports = { seedTrains, trainsData };