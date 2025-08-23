const { Station } = require('../models/index.model');


function createStationId(name) {
  return name
    .toLowerCase()
    .normalize('NFD') // Decompose Vietnamese characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/đ/g, 'd') // Replace đ with d
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

const stationsData = [
  // Tuyến Metro số 1
  {
    name: 'BX. Miền Đông mới',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8452,
    longitude: 106.7789,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'bus_terminal'],
    connections: ['bus_terminal', 'metro_line_1']
  },
  {
    name: 'Suối Tiên',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8889,
    longitude: 106.8056,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'parking'],
    connections: ['bus_station', 'theme_park', 'metro_line_1']
  },
  {
    name: 'Công nghệ cao',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8567,
    longitude: 106.7803,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station', 'metro_line_1']
  },
  {
    name: 'Thủ Đức',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8489,
    longitude: 106.7717,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station', 'metro_line_1']
  },
  {
    name: 'Bình Thái',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8156,
    longitude: 106.7756,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station', 'metro_line_1']
  },
  {
    name: 'Phước Long',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8067,
    longitude: 106.7689,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station', 'metro_line_1']
  },
  {
    name: 'Rạch Chiếc',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8033,
    longitude: 106.7578,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station', 'metro_line_1']
  },
  {
    name: 'An Phú',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8056,
    longitude: 106.7442,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station', 'metro_line_1']
  },
  {
    name: 'Thảo Điền',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8089,
    longitude: 106.7314,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station', 'metro_line_1']
  },
  {
    name: 'Cầu Sài Gòn',
    location: 'Quận Bình Thạnh, TP.HCM',
    latitude: 10.8050,
    longitude: 106.6900,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_1', 'metro_line_5', 'bus_station']
  },
  {
    name: 'Văn Thánh',
    location: 'Quận Bình Thạnh, TP.HCM',
    latitude: 10.8016,
    longitude: 106.7103,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station', 'metro_line_1', 'metro_line_5']
  },
  {
    name: 'Ba Son',
    location: 'Quận 1, TP.HCM',
    latitude: 10.7886,
    longitude: 106.7063,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station', 'ferry_terminal', 'metro_line_1', 'metro_line_5']
  },
  {
    name: 'Nhà hát',
    location: 'Quận 1, TP.HCM',
    latitude: 10.7769,
    longitude: 106.7009,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station', 'metro_line_1']
  },
  {
    name: 'Bến Thành',
    location: 'Quận 1, TP.HCM',
    latitude: 10.7727,
    longitude: 106.6980,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'shopping_center', 'parking'],
    connections: ['metro_line_1', 'metro_line_2', 'metro_line_3a', 'metro_line_4', 'metro_line_5', 'bus_station']
  },
  // Additional stations for Metro Line 1
  {
    name: 'Tao Đàn',
    location: 'Quận 1, TP.HCM',
    latitude: 10.7725,
    longitude: 106.6925,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_1', 'metro_line_2', 'bus_station']
  },
  {
    name: 'Dân Chủ',
    location: 'Quận 3, TP.HCM',
    latitude: 10.7750,
    longitude: 106.6850,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_1', 'metro_line_2', 'bus_station']
  },
  {
    name: 'Hòa Hưng',
    location: 'Quận 10, TP.HCM',
    latitude: 10.7775,
    longitude: 106.6775,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_1', 'metro_line_2', 'bus_station']
  },
  {
    name: 'CV. Lê Văn Tám',
    location: 'Quận Phú Nhuận, TP.HCM',
    latitude: 10.7850,
    longitude: 106.6725,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_1', 'metro_line_4', 'bus_station']
  },
  {
    name: 'Cầu Kiệu',
    location: 'Quận Phú Nhuận, TP.HCM',
    latitude: 10.7925,
    longitude: 106.6700,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_1', 'metro_line_4', 'bus_station']
  },
  {
    name: 'Nguyễn Kiệm',
    location: 'Quận Gò Vấp, TP.HCM',
    latitude: 10.8000,
    longitude: 106.6675,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_1', 'metro_line_4', 'bus_station']
  },
  {
    name: 'Quang Trung',
    location: 'Quận Gò Vấp, TP.HCM',
    latitude: 10.8075,
    longitude: 106.6650,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_1', 'metro_line_4', 'bus_station']
  },
  {
    name: 'Nguyễn Lượng',
    location: 'Quận Gò Vấp, TP.HCM',
    latitude: 10.8150,
    longitude: 106.6625,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_1', 'metro_line_4', 'bus_station']
  },
  {
    name: 'BV. Gò Vấp',
    location: 'Quận Gò Vấp, TP.HCM',
    latitude: 10.8225,
    longitude: 106.6600,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_1', 'metro_line_4', 'bus_station']
  },
  {
    name: 'Xóm Mới',
    location: 'Quận 12, TP.HCM',
    latitude: 10.8300,
    longitude: 106.6575,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_1', 'metro_line_4', 'bus_station']
  },
  {
    name: 'Thạnh Xuân',
    location: 'Quận 12, TP.HCM',
    latitude: 10.8669,
    longitude: 106.6250,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'depot'],
    connections: ['metro_line_1', 'metro_line_4', 'bus_station']
  },
  // Additional stations for Metro Line 2
  {
    name: 'BX. An Sương Mới',
    location: 'Quận 12, TP.HCM',
    latitude: 10.8392,
    longitude: 106.6169,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'bus_terminal'],
    connections: ['metro_line_2', 'bus_terminal']
  },
  {
    name: 'Tân Thới Nhất',
    location: 'Quận 12, TP.HCM',
    latitude: 10.8450,
    longitude: 106.6200,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'bus_station']
  },
  {
    name: 'Tham Lương',
    location: 'Quận 12, TP.HCM',
    latitude: 10.8556,
    longitude: 106.6264,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'depot'],
    connections: ['metro_line_2', 'bus_station']
  },
  {
    name: 'Phạm Văn Bạch',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.8400,
    longitude: 106.6350,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'bus_station']
  },
  {
    name: 'Bà Quẹo',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.8242,
    longitude: 106.6506,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'metro_line_6', 'bus_station']
  },
  {
    name: 'Nguyễn Hồng Đào',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.8300,
    longitude: 106.6450,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'bus_station']
  },
  {
    name: 'Đồng Đen',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.8250,
    longitude: 106.6500,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'bus_station']
  },
  {
    name: 'Bảy Hiền',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.8200,
    longitude: 106.6550,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'metro_line_5', 'bus_station']
  },
  {
    name: 'Phạm Văn Hai',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.8150,
    longitude: 106.6600,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'bus_station']
  },
  {
    name: 'Lê Thị Riêng',
    location: 'Quận 10, TP.HCM',
    latitude: 10.8050,
    longitude: 106.6700,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'bus_station']
  },
  {
    name: 'Mê Linh',
    location: 'Quận 4, TP.HCM',
    latitude: 10.7650,
    longitude: 106.7050,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'metro_line_4', 'metro_line_6', 'bus_station']
  },
  {
    name: 'Quảng Trường Thủ Thiêm',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.7881,
    longitude: 106.7197,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'bus_station']
  },
  {
    name: 'Trần Não',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.7903,
    longitude: 106.7283,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'bus_station']
  },
  {
    name: 'Bình Khánh',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.7756,
    longitude: 106.7389,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'bus_station']
  },
  {
    name: 'Ga Thủ Thiêm',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.7889,
    longitude: 106.7203,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'metro_line_5', 'bus_station']
  },
  {
    name: 'Bình Trưng',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.7850,
    longitude: 106.7300,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_2', 'metro_line_5', 'bus_station']
  },
  {
    name: 'Đồng Văn Cống',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.7800,
    longitude: 106.7400,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'parking'],
    connections: ['metro_line_2', 'metro_line_5', 'bus_station']
  },
  {
    name: 'Cát Lái',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.7400,
    longitude: 106.7300,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'parking'],
    connections: ['metro_line_2', 'bus_station', 'ferry_terminal']
  },
  // Tuyến Metro số 3a
  {
    name: 'BX. Miền Tây Mới',
    location: 'Quận Bình Tân, TP.HCM',
    latitude: 10.7542,
    longitude: 106.6097,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'bus_terminal'],
    connections: ['metro_line_3a', 'bus_terminal']
  },
  {
    name: 'An Lạc',
    location: 'Quận Bình Tân, TP.HCM',
    latitude: 10.7450,
    longitude: 106.6200,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'bus_station']
  },
  {
    name: 'Công Viên Phú Lâm',
    location: 'Quận 6, TP.HCM',
    latitude: 10.7417,
    longitude: 106.6292,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'bus_station']
  },
  {
    name: 'Phú Lâm',
    location: 'Quận 6, TP.HCM',
    latitude: 10.7389,
    longitude: 106.6208,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'bus_station']
  },
  {
    name: 'Cây Gõ',
    location: 'Quận 6, TP.HCM',
    latitude: 10.7450,
    longitude: 106.6300,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'bus_station']
  },
  {
    name: 'Chợ Lớn',
    location: 'Quận 6, TP.HCM',
    latitude: 10.7539,
    longitude: 106.6667,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'bus_station']
  },
  {
    name: 'Thuận Kiều',
    location: 'Quận 5, TP.HCM',
    latitude: 10.7517,
    longitude: 106.6831,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'metro_line_5', 'bus_station']
  },
  {
    name: 'Văn Lang',
    location: 'Quận 5, TP.HCM',
    latitude: 10.7631,
    longitude: 106.6789,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'bus_station']
  },
  {
    name: 'An Đông',
    location: 'Quận 5, TP.HCM',
    latitude: 10.6600,
    longitude: 106.5600,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'metro_line_5', 'bus_station']
  },
  {
    name: 'Cộng Hòa',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.8006,
    longitude: 106.6408,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'metro_line_3b', 'metro_line_6', 'bus_station']
  },
  {
    name: '23 Tháng 9',
    location: 'Quận 1, TP.HCM',
    latitude: 10.7694,
    longitude: 106.6917,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'bus_station']
  },
  // Tuyến Metro số 3b
  {
    name: 'Dinh Độc Lập',
    location: 'Quận 1, TP.HCM',
    latitude: 10.7775,
    longitude: 106.6928,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3b', 'bus_station']
  },
  {
    name: 'Hồ Con Rùa',
    location: 'Quận 3, TP.HCM',
    latitude: 10.7850,
    longitude: 106.6700,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3b', 'metro_line_4', 'bus_station']
  },
  {
    name: 'Thảo Cầm Viên',
    location: 'Quận 1, TP.HCM',
    latitude: 10.7900,
    longitude: 106.6750,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3b', 'metro_line_5', 'bus_station']
  },
  {
    name: 'Thị Nghè',
    location: 'Quận Bình Thạnh, TP.HCM',
    latitude: 10.8036,
    longitude: 106.7028,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3b', 'bus_station']
  },
  {
    name: 'Hàng Xanh',
    location: 'Quận Bình Thạnh, TP.HCM',
    latitude: 10.8000,
    longitude: 106.6850,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3b', 'metro_line_5', 'bus_station']
  },
  {
    name: 'Xô Viết Nghệ Tĩnh',
    location: 'Quận Bình Thạnh, TP.HCM',
    latitude: 10.8050,
    longitude: 106.6900,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3b', 'bus_station']
  },
  {
    name: 'Bình Triệu',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8100,
    longitude: 106.6950,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3b', 'bus_station']
  },
  {
    name: 'Hiệp Bình Phước',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8442,
    longitude: 106.7061,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'depot'],
    connections: ['metro_line_3b', 'bus_station']
  },
  {
    name: 'Tam Bình – Gò Dưa',
    location: 'TP. Thủ Đức, TP.HCM',
    latitude: 10.8200,
    longitude: 106.7050,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3b', 'bus_station']
  },
  {
    name: 'Sóng Thần',
    location: 'TP. Dĩ An, Bình Dương',
    latitude: 10.8250,
    longitude: 106.7100,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3b', 'bus_station']
  },
  {
    name: 'Ga Dĩ An',
    location: 'TP. Dĩ An, Bình Dương',
    latitude: 10.8300,
    longitude: 106.7150,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'train_station'],
    connections: ['metro_line_3b', 'train_station', 'bus_station']
  },
  // Tuyến Metro số 4
  {
    name: 'Thuận An',
    location: 'TP. Thuận An, Bình Dương',
    latitude: 10.9300,
    longitude: 106.7100,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'parking'],
    connections: ['metro_line_4', 'bus_station']
  },
  {
    name: 'Lái Thiêu',
    location: 'TP. Thuận An, Bình Dương',
    latitude: 10.9200,
    longitude: 106.7050,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'bus_station']
  },
  {
    name: 'Phú Long',
    location: 'TP. Thuận An, Bình Dương',
    latitude: 10.9100,
    longitude: 106.7000,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'bus_station']
  },
  {
    name: 'Thạnh Lộc',
    location: 'Quận 12, TP.HCM',
    latitude: 10.9000,
    longitude: 106.6950,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'bus_station']
  },
  {
    name: 'Bệnh Viện Gò Vấp',
    location: 'Quận Gò Vấp, TP.HCM',
    latitude: 10.8225,
    longitude: 106.6600,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'bus_station']
  },
  {
    name: 'Nguyễn Văn Lượng',
    location: 'Quận Gò Vấp, TP.HCM',
    latitude: 10.8150,
    longitude: 106.6625,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'bus_station']
  },
  {
    name: 'Công Viên Gia Định',
    location: 'Quận Gò Vấp, TP.HCM',
    latitude: 10.8203,
    longitude: 106.6797,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'bus_station']
  },
  {
    name: 'Phú Nhuận',
    location: 'Quận Phú Nhuận, TP.HCM',
    latitude: 10.7950,
    longitude: 106.6700,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'metro_line_5', 'bus_station']
  },
  {
    name: 'Khánh Hội',
    location: 'Quận 4, TP.HCM',
    latitude: 10.7600,
    longitude: 106.7100,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'metro_line_2', 'metro_line_6', 'bus_station']
  },
  {
    name: 'Tân Hưng',
    location: 'Quận 7, TP.HCM',
    latitude: 10.7550,
    longitude: 106.7150,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'metro_line_2', 'bus_station']
  },
  {
    name: 'Nguyễn Văn Linh',
    location: 'Quận 7, TP.HCM',
    latitude: 10.7450,
    longitude: 106.7250,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'metro_line_2', 'metro_line_6', 'bus_station']
  },
  {
    name: 'Hồ Bán Nguyệt',
    location: 'Quận 7, TP.HCM',
    latitude: 10.7300,
    longitude: 106.7300,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'bus_station']
  },
  {
    name: 'Nam Sài Gòn',
    location: 'Quận 7, TP.HCM',
    latitude: 10.7250,
    longitude: 106.7350,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'bus_station']
  },
  {
    name: 'Phú Mỹ',
    location: 'Quận 7, TP.HCM',
    latitude: 10.7200,
    longitude: 106.7350,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_4', 'bus_station']
  },
  {
    name: 'Nhà Bè',
    location: 'Huyện Nhà Bè, TP.HCM',
    latitude: 10.7100,
    longitude: 106.7400,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'parking'],
    connections: ['metro_line_4', 'bus_station']
  },
  // Tuyến Metro số 5
  {
    name: 'Bến Xe Cần Giuộc',
    location: 'Huyện Cần Giuộc, Long An',
    latitude: 10.6111,
    longitude: 106.5111,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'bus_terminal'],
    connections: ['metro_line_5', 'bus_terminal']
  },
  {
    name: 'Bình Hưng',
    location: 'Huyện Bình Chánh, TP.HCM',
    latitude: 10.6400,
    longitude: 106.5400,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Tạ Quang Bửu',
    location: 'Huyện Bình Chánh, TP.HCM',
    latitude: 10.6300,
    longitude: 106.5300,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Xóm Củi',
    location: 'Huyện Bình Chánh, TP.HCM',
    latitude: 10.6200,
    longitude: 106.5200,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Bách Khoa',
    location: 'Quận 10, TP.HCM',
    latitude: 10.7717,
    longitude: 106.6583,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Bắc Hải',
    location: 'Quận 10, TP.HCM',
    latitude: 10.7700,
    longitude: 106.6667,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Chợ Tân Bình',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.7997,
    longitude: 106.6544,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Lăng Cha Cả',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.8056,
    longitude: 106.6633,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Hoàng Văn Thụ',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.8014,
    longitude: 106.6522,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Nguyễn Văn Đậu',
    location: 'Quận Bình Thạnh, TP.HCM',
    latitude: 10.8089,
    longitude: 106.7042,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Bà Chiểu',
    location: 'Quận Bình Thạnh, TP.HCM',
    latitude: 10.8133,
    longitude: 106.7111,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  // Tuyến Metro số 6
  {
    name: 'Quốc Lộ 1A',
    location: 'Quận 12, TP.HCM',
    latitude: 10.8600,
    longitude: 106.6300,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'parking'],
    connections: ['metro_line_6', 'bus_station']
  },
  {
    name: 'Bình Hưng Hòa',
    location: 'Quận Bình Tân, TP.HCM',
    latitude: 10.8500,
    longitude: 106.6350,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_6', 'bus_station']
  },
  {
    name: 'Sơn Kỳ',
    location: 'Quận Tân Phú, TP.HCM',
    latitude: 10.8400,
    longitude: 106.6400,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_6', 'bus_station']
  },
  {
    name: 'Nguyễn Sơn',
    location: 'Quận Tân Phú, TP.HCM',
    latitude: 10.8300,
    longitude: 106.6450,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_6', 'bus_station']
  },
  {
    name: 'Bốn Xã',
    location: 'Quận Tân Phú, TP.HCM',
    latitude: 10.8250,
    longitude: 106.6475,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_6', 'bus_station']
  },
  {
    name: 'Hòa Bình',
    location: 'Quận Tân Phú, TP.HCM',
    latitude: 10.8100,
    longitude: 106.6550,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_6', 'bus_station']
  },
  {
    name: 'Đầm Sen',
    location: 'Quận 11, TP.HCM',
    latitude: 10.8000,
    longitude: 106.6600,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_6', 'bus_station']
  },
  {
    name: 'Lãnh Binh Thăng',
    location: 'Quận 11, TP.HCM',
    latitude: 10.7900,
    longitude: 106.6650,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_6', 'bus_station']
  },
  {
    name: 'Phú Thọ',
    location: 'Quận 11, TP.HCM',
    latitude: 10.7600,
    longitude: 106.6450,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'metro_line_5', 'metro_line_6', 'bus_station']
  },
  {
    name: 'Thành Thái',
    location: 'Quận 10, TP.HCM',
    latitude: 10.7650,
    longitude: 106.6500,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'metro_line_6', 'bus_station']
  },
  {
    name: 'Lý Thái Tổ',
    location: 'Quận 10, TP.HCM',
    latitude: 10.7700,
    longitude: 106.6550,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'metro_line_6', 'bus_station']
  },
  // Additional stations not tied to specific routes but present in original stationsData
  {
    name: 'Tân Cảng',
    location: 'Quận Bình Thạnh, TP.HCM',
    latitude: 10.8067,
    longitude: 106.7172,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'parking'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Khu đô thị Tây Bắc Củ Chi',
    location: 'Huyện Củ Chi, TP.HCM',
    latitude: 10.9789,
    longitude: 106.4903,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'parking'],
    connections: ['bus_station']
  },
  {
    name: 'Tân Kiên',
    location: 'Huyện Bình Chánh, TP.HCM',
    latitude: 10.7278,
    longitude: 106.5833,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'depot'],
    connections: ['metro_line_3a', 'bus_station']
  },
  {
    name: 'Sân bay Tân Sơn Nhất',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.8187,
    longitude: 106.6519,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom', 'airport_connection'],
    connections: ['airport', 'bus_station']
  },
  {
    name: 'Khu đô thị Hiệp Phước',
    location: 'Huyện Nhà Bè, TP.HCM',
    latitude: 10.6889,
    longitude: 106.7556,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station']
  },
  {
    name: 'Ngã tư Bảy Hiền',
    location: 'Quận Tân Bình, TP.HCM',
    latitude: 10.8000,
    longitude: 106.6500,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station']
  },
  {
    name: 'Tân Hòa Đông',
    location: 'Quận 6, TP.HCM',
    latitude: 10.7669,
    longitude: 106.6347,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['bus_station']
  },
  {
    name: 'Vòng xoay Phú Lâm',
    location: 'Quận 6, TP.HCM',
    latitude: 10.7389,
    longitude: 106.6208,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'bus_station']
  },
  {
    name: 'Võ Văn Kiệt',
    location: 'Quận 6, TP.HCM',
    latitude: 10.6500,
    longitude: 106.5500,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Trần Phú',
    location: 'Quận 5, TP.HCM',
    latitude: 10.6700,
    longitude: 106.5700,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Trương Định',
    location: 'Quận 1, TP.HCM',
    latitude: 10.6800,
    longitude: 106.5800,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_5', 'bus_station']
  },
  {
    name: 'Hồng Bàng',
    location: 'Quận 6, TP.HCM',
    latitude: 10.7550,
    longitude: 106.6400,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'bus_station']
  },
  {
    name: 'Lò Gốm',
    location: 'Quận 6, TP.HCM',
    latitude: 10.7500,
    longitude: 106.6350,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'bus_station']
  },
  {
    name: 'C2, Phú Lâm',
    location: 'Quận 6, TP.HCM',
    latitude: 10.7400,
    longitude: 106.6250,
    openTime: '05:00:00',
    closeTime: '23:00:00',
    facilities: ['elevator', 'escalator', 'restroom'],
    connections: ['metro_line_3a', 'bus_station']
  }
];

// Ensure all stations referenced in other seed files exist
const { routeStationsData } = require('./seedRouteStations');
const { routesData } = require('./seedRoutes');

// Build a set of all station names required by routes and route-station mappings
const requiredStationNames = new Set();
Object.values(routeStationsData).forEach((stationNames) => {
  stationNames.forEach((name) => requiredStationNames.add(name));
});
routesData.forEach((route) => {
  requiredStationNames.add(route.originName);
  requiredStationNames.add(route.destinationName);
});

// Collect existing station names from the hard-coded list above
const existingStationNames = new Set(stationsData.map((s) => s.name));

// Add placeholder objects for any missing stations so seeding doesn't fail
// Using a default central HCMC location instead of 0,0 coordinates
requiredStationNames.forEach((name) => {
  if (!existingStationNames.has(name)) {
    stationsData.push({
      name,
      location: 'TP.HCM',
      latitude: 10.7769, // Ben Thanh Market area - central HCMC
      longitude: 106.7009,
      openTime: '05:00:00',
      closeTime: '23:00:00',
      facilities: ['elevator', 'escalator', 'restroom'],
      connections: ['bus_station']
    });
  }
});

const seedStations = async () => {
  try {
    console.log('🚇 Bắt đầu seed dữ liệu ga Metro TPHCM...');
    
    // Xóa dữ liệu cũ nếu có
    await Station.destroy({ where: {} });
    
    // Tạo dữ liệu với simple station IDs
    const stationsWithIds = stationsData.map(station => ({
      ...station,
      stationId: createStationId(station.name)
    }));
    
    // Thêm dữ liệu mới
    const stations = await Station.bulkCreate(stationsWithIds);
    
    console.log(`✅ Đã tạo thành công ${stations.length} ga Metro TPHCM`);
    console.log('📍 Các ga đã tạo với simple IDs:');
    stations.forEach((station, index) => {
      console.log(`   ${index + 1}. ${station.stationId} -> ${station.name}`);
    });
    
    return stations;
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu ga Metro:', error);
    throw error;
  }
};

module.exports = { seedStations, stationsData };
