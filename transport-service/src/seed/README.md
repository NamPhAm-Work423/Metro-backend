# Seed Data cho Hệ thống Metro TPHCM

## Tổng quan

Thư mục này chứa các file seed để khởi tạo dữ liệu cho hệ thống Metro Thành phố Hồ Chí Minh, được xây dựng dựa trên quy hoạch chính thức của thành phố với 8 tuyến metro chính.

## Cấu trúc Files

```
seed/
├── index.js              # File chính để chạy tất cả seeds
├── seedStations.js       # Seed dữ liệu 33+ ga metro
├── seedRoutes.js         # Seed dữ liệu 8 tuyến metro  
├── seedRouteStations.js  # Liên kết ga với tuyến theo thứ tự
├── seedTrains.js         # Seed dữ liệu 28 tàu metro
└── README.md            # File hướng dẫn này
```

## Hệ thống Metro TPHCM

### 8 Tuyến Metro Chính

| Tuyến | Tên đầy đủ | Chiều dài | Số ga | Trạng thái |
|-------|------------|-----------|-------|------------|
| **Tuyến 1** | Bến Thành - Suối Tiên | 19.7 km | 14 ga | 🟢 Đang hoạt động |
| **Tuyến 2** | Bến Thành - Khu đô thị Tây Bắc Củ Chi | 48.0 km | 42 ga | 🟡 Đang xây dựng |
| **Tuyến 3A** | Bến Thành - Tân Kiên | 19.8 km | 18 ga | 🟡 Đang lập kế hoạch |
| **Tuyến 3B** | Ngã 6 Cộng Hòa - Hiệp Bình Phước | 12.1 km | 10 ga | 🟡 Đang lập kế hoạch |
| **Tuyến 4** | Thạnh Xuân - Khu đô thị Hiệp Phước | 36.2 km | 32 ga | 🟡 Đang nghiên cứu |
| **Tuyến 4B** | Công Viên Gia Định - Lăng Cha Cả | 3.2 km | 3 ga | 🟡 Đang nghiên cứu |
| **Tuyến 5** | Tân Cảng - Bến xe Cần Giuộc mới | 23.4 km | 22 ga | 🟡 Đang nghiên cứu |
| **Tuyến 6** | Bà Quẹo - Vòng xoay Phú Lâm | 6.8 km | 7 ga | 🟡 Đang nghiên cứu |

### Các ga chính và kết nối

- **Ga trung tâm Bến Thành**: Kết nối tuyến 1, 2, 3A, 4
- **Ga Tân Cảng**: Kết nối tuyến 1, 5
- **Ga Sân bay Tân Sơn Nhất**: Kết nối tuyến 3B, 4B
- **Ga Bà Quẹo**: Kết nối tuyến 2, 6

## Cách sử dụng

### 1. Chạy tất cả seeds

```bash
# Từ thư mục transport-service
cd src/seed
node index.js
```

### 2. Chạy từng seed riêng lẻ

```bash
# Chỉ tạo ga metro
node -e "require('./seedStations').seedStations()"

# Chỉ tạo tuyến metro  
node -e "require('./seedRoutes').seedRoutes()"

# Chỉ tạo liên kết ga-tuyến
node -e "require('./seedRouteStations').seedRouteStations()"

# Chỉ tạo tàu metro
node -e "require('./seedTrains').seedTrains()"
```

### 3. Import vào code khác

```javascript
const { runAllSeeds } = require('./seed');

// Chạy tất cả seeds
await runAllSeeds();

// Hoặc chạy riêng lẻ
const { seedStations } = require('./seed/seedStations');
await seedStations();
```

## Dữ liệu được tạo

### Stations (Ga Metro)
- **Tổng số**: 33+ ga metro
- **Thông tin**: Tên, vị trí, tọa độ, giờ hoạt động, tiện ích, kết nối
- **Tiện ích**: Thang máy, thang cuốn, nhà vệ sinh, trung tâm thương mại, bãi đỗ xe
- **Kết nối**: Tuyến metro khác, xe buýt, phà, sân bay

### Routes (Tuyến Metro)
- **Tổng số**: 8 tuyến metro
- **Thông tin**: Tên, ga đầu/cuối, khoảng cách, thời gian di chuyển, trạng thái
- **Trạng thái**: Đang hoạt động (tuyến 1) hoặc đang xây dựng/lập kế hoạch

### RouteStations (Liên kết Ga-Tuyến)
- **Chức năng**: Xác định thứ tự các ga trên từng tuyến
- **Dữ liệu**: Tuyến, ga, thứ tự (sequence)

### Trains (Tàu Metro)
- **Tổng số**: 28 tàu metro
- **Loại tàu**: 
  - Standard (tiêu chuẩn): 400-1000 hành khách
  - Express (tốc hành): 600-1400 hành khách
- **Trạng thái**:
  - Active: 9 tàu (chỉ tuyến 1)
  - Maintenance: 1 tàu
  - Out-of-service: 18 tàu (các tuyến chưa hoạt động)

## Cấu trúc Database

Hệ thống sử dụng các mối quan hệ sau:

```
Station (Ga)
├── hasMany RouteStation (Liên kết ga-tuyến)
├── hasMany Stop (Điểm dừng)
└── hasMany Route (Tuyến - qua originId/destinationId)

Route (Tuyến)  
├── hasMany RouteStation (Liên kết ga-tuyến)
├── hasMany Trip (Chuyến đi)
├── belongsTo Station (Ga đầu - origin)
└── belongsTo Station (Ga cuối - destination)

Train (Tàu)
└── hasMany Trip (Chuyến đi)

Trip (Chuyến đi)
├── belongsTo Route (Tuyến)
├── belongsTo Train (Tàu)  
└── hasMany Stop (Điểm dừng)
```

## Lưu ý quan trọng

1. **Dependencies**: Phải chạy theo thứ tự: Stations → Routes → RouteStations → Trains
2. **Database**: Đảm bảo database đã được kết nối và sync trước khi chạy
3. **Data Reset**: Mỗi lần chạy sẽ xóa dữ liệu cũ và tạo mới
4. **Environment**: Đảm bảo các biến môi trường database đã được cấu hình

## Nguồn tham khảo

- [Quy hoạch Metro TPHCM chính thức](http://maur.hochiminhcity.gov.vn/)
- [Tuyến Metro số 1 Bến Thành - Suối Tiên](https://maur.hochiminhcity.gov.vn/web/en/metro-line-1)
- [Báo cáo tiến độ hệ thống Metro TPHCM](https://taumetro.com/he-thong-tau-metro-tphcm/)

## Cập nhật

- **Phiên bản**: 1.0.0
- **Ngày tạo**: Tháng 1/2025
- **Dựa trên**: Quy hoạch Metro TPHCM cập nhật 2025
- **Tình trạng**: Tuyến 1 đã vận hành (Q4/2024), các tuyến khác đang triển khai 