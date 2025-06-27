# Vai trò của Redis Cache trong API Gateway

Redis là một kho lưu trữ dữ liệu key-value trong bộ nhớ (in-memory) hiệu suất cao, được sử dụng trong API Gateway với nhiều mục đích quan trọng để tối ưu hóa hiệu suất, tăng cường bảo mật và đảm bảo tính linh hoạt của hệ thống.

## Các chức năng chính

### 1. Caching API Key để xác thực nhanh

-   **Mục đích**: Giảm độ trễ khi xác thực các yêu cầu (request) đến API Gateway.
-   **Cách hoạt động**: Khi một yêu cầu đến với một API key, thay vì phải truy vấn vào database chính (PostgreSQL) để kiểm tra, API Gateway sẽ:
    1.  **Kiểm tra trong Redis trước**: Tìm API key trong cache của Redis. Vì Redis lưu dữ liệu trong RAM, thao tác này cực kỳ nhanh (thường dưới 1ms).
    2.  **Cache-hit**: Nếu tìm thấy (cache hit), API key được xác thực ngay lập tức và yêu cầu được tiếp tục xử lý.
    3.  **Cache-miss**: Nếu không tìm thấy (cache miss), API Gateway sẽ truy vấn database chính, sau đó lưu (cache) thông tin API key vào Redis để các lần truy vấn sau sẽ nhanh hơn.
-   **Lợi ích**:
    -   **Tăng tốc độ**: Cải thiện hiệu suất xác thực lên 10-50 lần so với việc luôn truy vấn database.
    -   **Giảm tải cho Database**: Giảm số lượng truy vấn đến database chính, giúp database hoạt động hiệu quả hơn cho các tác vụ quan trọng khác.
-   **File liên quan**: `src/services/user.service.js`

### 2. Rate Limiting (Giới hạn tần suất truy cập)

-   **Mục đích**: Bảo vệ API khỏi các cuộc tấn công DoS (Denial of Service), Brute-force và đảm bảo việc sử dụng tài nguyên một cách công bằng.
-   **Cách hoạt động**: Redis được dùng để theo dõi số lượng yêu cầu từ một địa chỉ IP hoặc một user trong một khoảng thời gian nhất định.
    -   Mỗi khi có yêu cầu, API Gateway sẽ tăng một bộ đếm (counter) trong Redis cho key tương ứng (ví dụ: `rate-limit:<ip-address>`).
    -   Nếu bộ đếm vượt quá ngưỡng cho phép, yêu cầu sẽ bị từ chối.
    -   Redis tự động xóa các key này sau khi hết khoảng thời gian quy định (ví dụ: 1 phút).
-   **Lợi ích**:
    -   **Bảo mật**: Ngăn chặn các hành vi lạm dụng API.
    -   **Độ tin cậy**: Đảm bảo API luôn sẵn sàng phục vụ cho những người dùng hợp lệ.
-   **File liên quan**: `src/middlewares/auth.middleware.js`

### 3. Service Discovery (Khám phá dịch vụ) và Load Balancing (Cân bằng tải)

-   **Mục đích**: Giúp API Gateway tự động định tuyến các yêu cầu đến các microservice backend một cách linh hoạt.
-   **Cách hoạt động**:
    1.  Khi một microservice (ví dụ: `user-service`, `transport-service`) khởi động, nó sẽ đăng ký thông tin về các "instance" (phiên bản) của mình vào Redis. Thông tin này bao gồm địa chỉ IP, port và endpoint.
    2.  API Gateway đọc thông tin này từ Redis để biết được có những service nào và instance nào đang hoạt động.
    3.  Khi có yêu cầu cần được chuyển đến một microservice, API Gateway sẽ sử dụng danh sách các instance từ Redis để chọn một instance và chuyển tiếp yêu cầu (ví dụ: theo thuật toán Round Robin).
-   **Lợi ích**:
    -   **Linh hoạt**: Dễ dàng thêm hoặc bớt các instance của microservice mà không cần phải cấu hình lại API Gateway.
    -   **Khả năng chịu lỗi (Fault Tolerance)**: Nếu một instance bị lỗi, API Gateway có thể ngừng gửi yêu cầu đến nó và chuyển sang các instance khỏe mạnh khác.
-   **File liên quan**: `src/initialize.js`, `src/services/service.service.js`

### 4. Lưu trữ dữ liệu tạm thời (Temporary Data Storage)

-   **Mục đích**: Lưu trữ các dữ liệu có thời gian sống ngắn một cách hiệu quả.
-   **Ví dụ**: Lưu trữ token để reset mật khẩu.
    -   Khi người dùng yêu cầu reset mật khẩu, một token duy nhất được tạo ra và lưu vào Redis với một key (ví dụ: `reset:<user-id>`) và có thời gian hết hạn (TTL - Time To Live).
    -   Khi người dùng sử dụng token này để xác nhận, hệ thống sẽ kiểm tra sự tồn tại và hợp lệ của nó trong Redis.
    -   Token sẽ tự động bị xóa khỏi Redis sau khi hết hạn, tăng cường tính bảo mật.
-   **File liên quan**: `src/services/user.service.js`

## Kết luận

Redis đóng vai trò là một "con dao đa năng" của Thụy Sĩ trong kiến trúc của API Gateway. Nó không chỉ là một bộ đệm (cache) đơn thuần mà còn là một thành phần trung tâm giúp hệ thống hoạt động nhanh hơn, an toàn hơn và linh hoạt hơn trong môi trường microservices. 