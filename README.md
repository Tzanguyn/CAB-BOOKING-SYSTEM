# ĐỒ ÁN: CAB BOOKING SYSTEM
## Cấu trúc thư mục dự án

cab-booking-system/
│
├── clients/                         # Tầng giao diện (View)
│   ├── admin-dashboard/             # Web quản trị cho nhà vận hành
│   ├── customer-app/                # Web/App cho khách hàng đặt xe
│   └── driver-app/                  # Web/App cho tài xế nhận cuốc
│
├── api-gateway/                     # Cổng vào duy nhất của hệ thống
│   ├── controllers/                 # Điều phối request
│   ├── routes/                      # Định tuyến API công khai
│   ├── services/                    # Gọi các microservices
│   ├── middlewares/                 # Auth, phân quyền, rate-limit
│   ├── websocket/                   # Kết nối realtime client
│   ├── config/                      # Cấu hình gateway
│   └── app.js                       # Điểm khởi chạy gateway
│
├── services/                        # Tầng Microservices
│
│   ├── auth-service/                # Xác thực & cấp JWT
│   │   ├── controllers/             # API đăng nhập/đăng ký
│   │   ├── services/                # Logic xác thực
│   │   ├── repositories/            # Truy vấn CSDL
│   │   ├── models/                  # Schema tài khoản
│   │   ├── routes/                  # Endpoint service
│   │   ├── events/                  # Sự kiện xác thực
│   │   ├── middlewares/             # Validate, auth nội bộ
│   │   ├── config/                  # DB, env config
│   │   └── app.js                   # Entry point service
│
│   ├── user-service/                # Quản lý khách hàng
│   │   ├── controllers/             # API hồ sơ người dùng
│   │   ├── services/                # Logic người dùng
│   │   ├── repositories/            # Truy xuất dữ liệu
│   │   ├── models/                  # Schema user
│   │   ├── routes/
│   │   ├── events/
│   │   ├── middlewares/
│   │   ├── config/
│   │   └── app.js
│
│   ├── driver-service/              # Quản lý tài xế
│   │   ├── controllers/             # API tài xế
│   │   ├── services/                # Logic trạng thái tài xế
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── events/                  # DriverStatusChanged
│   │   ├── middlewares/
│   │   ├── config/
│   │   └── app.js
│
│   ├── booking-service/             # Xử lý đặt xe
│   │   ├── controllers/             # Tạo yêu cầu đặt xe
│   │   ├── services/                # Logic booking
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── events/                  # RideCreated
│   │   ├── middlewares/
│   │   ├── config/
│   │   └── app.js
│
│   ├── ride-service/                # Quản lý chuyến đi
│   │   ├── controllers/             # Start/End ride
│   │   ├── services/                # Logic vòng đời chuyến đi
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── events/                  # RideStatusChanged
│   │   ├── middlewares/
│   │   ├── config/
│   │   └── app.js
│
│   ├── pricing-service/             # Tính giá cước
│   │   ├── controllers/             # API tính giá
│   │   ├── services/                # Logic giá
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── events/
│   │   ├── middlewares/
│   │   ├── config/
│   │   └── app.js
│
│   ├── payment-service/             # Thanh toán
│   │   ├── controllers/             # API thanh toán
│   │   ├── services/                # Logic payment
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── events/                  # PaymentSuccess
│   │   ├── middlewares/
│   │   ├── config/
│   │   └── app.js
│
│   ├── review-service/              # Đánh giá sau chuyến đi
│   │   ├── controllers/             # API đánh giá
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── events/
│   │   ├── middlewares/
│   │   ├── config/
│   │   └── app.js
│
│   └── notification-service/        # Thông báo hệ thống
│       ├── controllers/             # API gửi thông báo
│       ├── services/                # Logic notify
│       ├── repositories/
│       ├── models/
│       ├── routes/
│       ├── events/                  # Consume events
│       ├── middlewares/
│       ├── config/
│       └── app.js
│
├── realtime/                        # Realtime GPS & trạng thái
│   └── socket-server/
│       ├── controllers/             # Socket controller
│       ├── services/                # Xử lý GPS, tracking
│       ├── events/                  # Realtime events
│       └── index.js                 # Socket server
│
├── message-broker/                  # Event-driven system
│   ├── kafka/                       # Kafka broker
│   └── rabbitmq/                    # RabbitMQ broker
│
├── database/                        # Tầng dữ liệu
│   ├── postgres/                    # CSDL quan hệ
│   ├── mongodb/                     # CSDL NoSQL
│   └── redis/                       # Cache & session
│
├── shared/                          # Dùng chung toàn hệ thống
│   ├── constants/                   # Hằng số
│   ├── events/                      # Định nghĩa event
│   ├── dto/                         # Chuẩn dữ liệu
│   ├── utils/                       # Hàm tiện ích
│   └── logger/                      # Ghi log
│
├── docker-compose.yml               # Chạy toàn hệ thống
├── .env                             # Biến môi trường
└── README.md                        # Hướng dẫn dự án
