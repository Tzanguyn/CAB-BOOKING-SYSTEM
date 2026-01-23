# User Service - Postman Test Guide

## 📋 Tổng quan

File này hướng dẫn cách sử dụng Postman collection để test User Service API.

## 🚀 Cài đặt

### 1. Import Collection vào Postman

1. Mở Postman
2. Click **Import** (góc trên bên trái)
3. Chọn file `postman_collection.json`
4. Collection "User Service API" sẽ xuất hiện

### 2. Cấu hình Variables

Collection sử dụng các biến sau:

- **base_url**: `http://localhost:3010/api/users` (mặc định)
- **token**: JWT token nếu authentication được bật (hiện tại đang disabled)
- **user_id**: `user-123` (mặc định) - User ID để test, sẽ được gửi trong header `X-User-Id`

Để thay đổi:
1. Click vào collection "User Service API"
2. Chọn tab **Variables**
3. Sửa giá trị:
   - `base_url`: URL của service (ví dụ: `http://localhost:3010/api/users`)
   - `user_id`: User ID để test (ví dụ: `user-123` hoặc `test-user-001`)

**Lưu ý**: Collection tự động thêm header `X-User-Id` vào tất cả requests. Bạn có thể thay đổi `user_id` variable để test với các user khác nhau.

## 📝 Các Endpoints

### 1. Health Check
- **GET** `/health`
- Không cần authentication
- Kiểm tra service có đang chạy không

### 2. Profile Management

#### Create Profile
- **POST** `/profile`
- Body example:
```json
{
  "avatar": "https://example.com/avatar.jpg",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "preferredLanguage": "vi",
  "marketingEmails": true,
  "smsNotifications": true,
  "pushNotifications": true,
  "emergencyContact": {
    "name": "John Doe",
    "phone": "+84123456789",
    "relationship": "spouse"
  },
  "preferredVehicleType": "standard",
  "accessibilityNeeds": [],
  "appSettings": {
    "theme": "dark",
    "mapStyle": "standard",
    "notificationSounds": true
  }
}
```

#### Get Profile
- **GET** `/profile`
- Lấy thông tin profile của user hiện tại

#### Update Profile
- **PUT** `/profile`
- Body example:
```json
{
  "avatar": "https://example.com/new-avatar.jpg",
  "preferredLanguage": "en",
  "marketingEmails": false,
  "appSettings": {
    "theme": "light"
  }
}
```

#### Get Profile Completeness
- **GET** `/profile/completeness`
- Lấy phần trăm hoàn thiện profile

### 3. Ride History

#### Get Ride History
- **GET** `/rides?page=1&limit=10`
- Query parameters:
  - `page`: Số trang (mặc định: 1)
  - `limit`: Số items mỗi trang (mặc định: 10, max: 50)

#### Get Ride Details
- **GET** `/rides/:rideId`
- Path parameter: `rideId` - ID của ride

#### Rate Ride
- **POST** `/rides/:rideId/rate`
- Body example:
```json
{
  "rating": 5,
  "review": "Great ride! Very comfortable and driver was professional."
}
```

### 4. Statistics

#### Get User Statistics
- **GET** `/statistics`
- Lấy thống kê: tổng số rides, tổng chi tiêu, rating trung bình, etc.

#### Get Popular Destinations
- **GET** `/popular-destinations?limit=5`
- Query parameter: `limit` - Số destinations muốn lấy

### 5. Favorite Locations

#### Get Favorite Locations
- **GET** `/favorite-locations`
- Lấy danh sách địa điểm yêu thích

#### Add Favorite Location
- **POST** `/favorite-locations`
- Body example:
```json
{
  "name": "Home",
  "address": "123 Main Street, Ho Chi Minh City",
  "lat": 10.762622,
  "lng": 106.660172,
  "type": "home"
}
```
- `type`: `home`, `work`, hoặc `other`

#### Remove Favorite Location
- **DELETE** `/favorite-locations/:index`
- Path parameter: `index` - Vị trí trong mảng (bắt đầu từ 0)

### 6. Loyalty Program

#### Get Loyalty Status
- **GET** `/loyalty/status`
- Lấy điểm thưởng và tier hiện tại

#### Get Loyalty Leaderboard
- **GET** `/loyalty/leaderboard?limit=10`
- Query parameter: `limit` - Số top users muốn lấy

### 7. Internal API

#### Add Ride to History (Internal)
- **POST** `/internal/rides`
- API nội bộ, được gọi bởi booking service
- Body example xem trong collection

## 🧪 Test Flow Khuyến nghị

1. **Health Check** - Kiểm tra service đang chạy
2. **Create Profile** - Tạo profile mới
3. **Get Profile** - Xác nhận profile đã được tạo
4. **Get Profile Completeness** - Kiểm tra độ hoàn thiện
5. **Add Favorite Location** - Thêm địa điểm yêu thích
6. **Get Favorite Locations** - Xác nhận đã thêm
7. **Add Ride to History (Internal)** - Thêm ride mẫu
8. **Get Ride History** - Xem lịch sử rides
9. **Get Statistics** - Xem thống kê
10. **Get Loyalty Status** - Kiểm tra điểm thưởng

## ⚠️ Lưu ý

1. **Authentication**: Hiện tại authentication đang disabled (middleware skip). Nếu bật lại, cần thêm JWT token vào header `Authorization: Bearer <token>`

2. **User ID**: 
   - Collection tự động thêm header `X-User-Id` vào tất cả requests
   - User ID được lấy từ collection variable `user_id` (mặc định: `user-123`)
   - Bạn có thể thay đổi `user_id` trong Variables để test với user khác nhau
   - Hoặc thêm header `X-User-Id` thủ công trong từng request
   - Hoặc thêm query parameter `?userId=user-123` vào URL

3. **MongoDB**: Đảm bảo MongoDB đang chạy và kết nối được

4. **Redis**: Service vẫn hoạt động nếu Redis không available (chỉ không có cache)

## 🔧 Troubleshooting

### Lỗi "User ID not found"
- Đảm bảo collection variable `user_id` đã được set (mặc định: `user-123`)
- Hoặc thêm header `X-User-Id: user-123` vào request
- Hoặc thêm query parameter `?userId=user-123` vào URL
- Kiểm tra trong Postman: Collection → Variables → `user_id` phải có giá trị

### Lỗi kết nối MongoDB
- Kiểm tra MongoDB đang chạy: `mongosh` hoặc `mongo`
- Kiểm tra `MONGODB_URL` trong `.env`

### Lỗi kết nối Redis
- Service vẫn hoạt động, chỉ không có cache
- Kiểm tra Redis: `redis-cli ping`

## 📚 Thêm thông tin

Xem thêm trong:
- `src/routes/userRoutes.js` - Định nghĩa routes
- `src/controllers/userController.js` - Logic xử lý
- `src/models/UserProfile.js` - Schema profile
- `src/models/RideHistory.js` - Schema ride history

