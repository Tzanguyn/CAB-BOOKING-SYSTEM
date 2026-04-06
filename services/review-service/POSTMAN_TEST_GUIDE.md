# Hướng dẫn Test Review Service với Postman

## 🚀 Quick Start - Test nhanh

### Bước 1: Kiểm tra service đang chạy
```
GET http://localhost:3009/api/reviews/health
```

### Bước 2: Tạo đánh giá đầu tiên

**URL**: `POST http://localhost:3009/api/reviews`

**✅ KHÔNG CẦN AUTHENTICATION!**

Trong môi trường development, service sẽ **tự động tạo userId** nếu bạn không gửi. Bạn chỉ cần gửi request body:

**Body** (tab Body → raw → JSON):
```json
{
  "subjectType": "driver",
  "subjectId": "507f1f77bcf86cd799439012",
  "rating": 5,
  "comment": "Tài xế rất tốt"
}
```

**Thế là xong!** Service sẽ tự động:
- Tạo userId ngẫu nhiên cho bạn
- Lưu review với userId đó
- In ra console: `⚠️ [DEV MODE] Auto-generated userId: ...`

**Tùy chọn**: Nếu muốn dùng userId cụ thể, thêm vào body:
```json
{
  "subjectType": "driver",
  "subjectId": "507f1f77bcf86cd799439012",
  "rating": 5,
  "comment": "Tài xế rất tốt"
}
```

---

## Cấu hình cơ bản

### Base URL
```
http://localhost:3009
```

### Headers cần thiết

#### Public Endpoints (không cần auth)
- Không cần header đặc biệt

#### Protected Endpoints (cần auth)
**✅ TRONG MÔI TRƯỜNG DEVELOPMENT:**
- **KHÔNG CẦN** gửi userId - service sẽ tự động tạo!
- Chỉ cần gửi request body bình thường

**Nếu muốn dùng userId cụ thể (tùy chọn):**
- `x-user-id`: ID của người dùng (header, chữ thường)
- `userId`: ID trong request body
- `x-user-role`: Vai trò người dùng (`user`, `admin`, `moderator`) - tùy chọn, mặc định là `user`

#### Content-Type
- `Content-Type: application/json`

---

## ❓ FAQ - Câu hỏi thường gặp

### Q: `userId` là gì? Lấy từ đâu?

**A: `userId` là ID của người dùng đang tạo đánh giá**

**Key `userId`:**
- Đây là tên field bắt buộc trong request body
- Code đọc: `req.body.userId` → phải đúng tên `userId` (không phải `user_id` hay `user-id`)

**Value (MongoDB ObjectId):**
- Format: 24 ký tự hex (0-9, a-f)
- Ví dụ hợp lệ: `507f1f77bcf86cd799439011`
- **Để test, bạn có thể dùng bất kỳ ObjectId hợp lệ nào, không cần user thực sự tồn tại**

**Cách lấy userId để test:**

1. **Dùng ID mẫu** (đơn giản nhất):
   ```
   507f1f77bcf86cd799439011
   ```

2. **Tạo mới bằng Node.js**:
   ```javascript
   const mongoose = require('mongoose');
   const newId = new mongoose.Types.ObjectId().toString();
   console.log(newId); // Ví dụ: 65a1b2c3d4e5f6a7b8c9d0e1f
   ```

3. **Online generator**: 
   - Truy cập: https://www.objectidgenerator.com/
   - Hoặc search "MongoDB ObjectId generator"

4. **Nếu có Auth Service chạy**:
   - Đăng ký/đăng nhập user → lấy user ID từ response
   - Hoặc query database MongoDB để lấy user ID thực tế

**Ví dụ đầy đủ trong Body:**
```json
{
  "subjectType": "driver",
  "subjectId": "507f1f77bcf86cd799439012",
  "rating": 5,
  "comment": "Tài xế rất tốt",
  "userId": "507f1f77bcf86cd799439011"  ← Đây là key và value
}
```

**Lưu ý**: 
- `userId` là key (tên field) - phải đúng chính tả
- `507f1f77bcf86cd799439011` là value (giá trị) - có thể thay bằng ObjectId khác

---

## 1. Health Check

### GET /api/reviews/health
**Mô tả**: Kiểm tra trạng thái service

**Request**:
```
GET http://localhost:3009/api/reviews/health
```

**Response mẫu**:
```json
{
  "service": "review-service",
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "database": {
    "status": "healthy",
    "state": "connected"
  }
}
```

---

## 2. Tạo đánh giá mới

### POST /api/reviews
**Mô tả**: Tạo đánh giá mới cho driver, passenger, app hoặc station

**✅ KHÔNG CẦN HEADER HOẶC userId!**

Trong development mode, service sẽ tự động tạo userId cho bạn.

**⚠️ QUAN TRỌNG - Cách set Body trong Postman:**

1. Chọn tab **Body**
2. Chọn radio button **raw**
3. Chọn dropdown **JSON** (không phải Text!)
4. Đảm bảo có header `Content-Type: application/json` (Postman tự động thêm khi chọn JSON)

**Request Body** (chỉ cần gửi dữ liệu đánh giá):
```json
{
  "subjectType": "driver",
  "subjectId": "507f1f77bcf86cd799439012",
  "rating": 5,
  "comment": "Tài xế rất chuyên nghiệp, lái xe an toàn và thân thiện",
  "title": "Đánh giá tuyệt vời",
  "tags": ["excellent_service", "good_driver", "safe_ride"],
  "rideId": "507f1f77bcf86cd799439013",
  "detailedRatings": {
    "driver": 5,
    "vehicle": 4,
    "comfort": 5,
    "safety": 5,
    "punctuality": 5
  }
}
```

**Tùy chọn**: Nếu muốn dùng userId cụ thể, thêm vào body:
```json
{
  ...
  "userId": "507f1f77bcf86cd799439011"
}
```

**Response mẫu**:
```json
{
  "success": true,
  "message": "Đánh giá đã được gửi thành công",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "subject": {
      "type": "driver",
      "id": "507f1f77bcf86cd799439012"
    },
    "rating": 5,
    "comment": "Tài xế rất chuyên nghiệp, lái xe an toàn và thân thiện",
    "status": "approved",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Subject Types hợp lệ**: `driver`, `passenger`, `app`, `station`

---

## 3. Tạo đánh giá cho tài xế (alias)

### POST /api/reviews/drivers/:driverId/reviews
**Mô tả**: Tạo đánh giá cho tài xế cụ thể

**Headers**:
```
X-User-Id: 507f1f77bcf86cd799439011
Content-Type: application/json
```

**Request**:
```
POST http://localhost:3009/api/reviews/drivers/507f1f77bcf86cd799439012/reviews
```

**Request Body**:
```json
{
  "rating": 4,
  "comment": "Tài xế tốt, nhưng có thể cải thiện thêm",
  "tags": ["good_driver", "on_time"]
}
```

---

## 4. Lấy danh sách đánh giá theo subject

### GET /api/reviews/:subjectType/:subjectId
**Mô tả**: Lấy danh sách đánh giá của một subject (driver, passenger, app, station)

**Request**:
```
GET http://localhost:3009/api/reviews/driver/507f1f77bcf86cd799439012?page=1&limit=10&minRating=4&hasResponse=true
```

**Query Parameters**:
- `page`: Số trang (mặc định: 1)
- `limit`: Số lượng mỗi trang (mặc định: 10, tối đa: 50)
- `minRating`: Điểm tối thiểu (1-5)
- `maxRating`: Điểm tối đa (1-5)
- `hasResponse`: Có phản hồi hay không (true/false)
- `tags`: Danh sách tags, phân cách bằng dấu phẩy

**Response mẫu**:
```json
{
  "success": true,
  "message": "Lấy danh sách đánh giá thành công",
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "rating": 5,
      "comment": "Tuyệt vời",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalReviews": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## 5. Lấy thống kê đánh giá

### GET /api/reviews/:subjectType/:subjectId/stats
**Mô tả**: Lấy thống kê đánh giá (điểm trung bình, phân phối điểm)

**Request**:
```
GET http://localhost:3009/api/reviews/driver/507f1f77bcf86cd799439012/stats
```

**Response mẫu**:
```json
{
  "success": true,
  "message": "Thống kê đánh giá thành công",
  "data": {
    "average": 4.5,
    "total": 100,
    "distribution": {
      "1": 5,
      "2": 10,
      "3": 15,
      "4": 30,
      "5": 40
    }
  }
}
```

---

## 6. Lấy chi tiết một đánh giá

### GET /api/reviews/reviews/:reviewId
**Mô tả**: Lấy thông tin chi tiết của một đánh giá

**Request**:
```
GET http://localhost:3009/api/reviews/reviews/65a1b2c3d4e5f6g7h8i9j0k1
```

**Response mẫu**:
```json
{
  "success": true,
  "message": "Lấy đánh giá thành công",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "subject": {
      "type": "driver",
      "id": "507f1f77bcf86cd799439012"
    },
    "rating": 5,
    "comment": "Tuyệt vời",
    "status": "approved",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 7. Cập nhật đánh giá

### PUT /api/reviews/reviews/:reviewId
**Mô tả**: Cập nhật đánh giá (chỉ trong 24 giờ đầu)

**Headers**:
```
X-User-Id: 507f1f77bcf86cd799439011
Content-Type: application/json
```

**Request**:
```
PUT http://localhost:3009/api/reviews/reviews/65a1b2c3d4e5f6g7h8i9j0k1
```

**Request Body**:
```json
{
  "comment": "Cập nhật: Tài xế rất tốt, đã cải thiện",
  "title": "Đánh giá cập nhật"
}
```

---

## 8. Xóa đánh giá

### DELETE /api/reviews/reviews/:reviewId
**Mô tả**: Xóa đánh giá (soft delete)

**Headers**:
```
X-User-Id: 507f1f77bcf86cd799439011
```

**Request**:
```
DELETE http://localhost:3009/api/reviews/reviews/65a1b2c3d4e5f6g7h8i9j0k1
```

---

## 9. Lấy đánh giá của tôi

### GET /api/reviews/my-reviews
**Mô tả**: Lấy danh sách đánh giá của người dùng hiện tại

**Headers**:
```
X-User-Id: 507f1f77bcf86cd799439011
```

**Request**:
```
GET http://localhost:3009/api/reviews/my-reviews?page=1&limit=10
```

---

## 10. Vote hữu ích

### POST /api/reviews/reviews/:reviewId/helpful
**Mô tả**: Đánh dấu đánh giá là hữu ích

**Headers**:
```
X-User-Id: 507f1f77bcf86cd799439011
```

**Request**:
```
POST http://localhost:3009/api/reviews/reviews/65a1b2c3d4e5f6g7h8i9j0k1/helpful
```

---

## 11. Thêm phản hồi

### POST /api/reviews/reviews/:reviewId/response
**Mô tả**: Thêm phản hồi từ driver/company cho đánh giá

**Headers**:
```
X-User-Id: 507f1f77bcf86cd799439011
Content-Type: application/json
```

**Request**:
```
POST http://localhost:3009/api/reviews/reviews/65a1b2c3d4e5f6g7h8i9j0k1/response
```

**Request Body**:
```json
{
  "responseText": "Cảm ơn bạn đã đánh giá. Chúng tôi sẽ cố gắng cải thiện dịch vụ.",
  "responderType": "company"
}
```

---

## 12. Lấy trending reviews

### GET /api/reviews/trending
**Mô tả**: Lấy các đánh giá trending (hữu ích nhất, mới nhất)

**Request**:
```
GET http://localhost:3009/api/reviews/trending?limit=10&days=7
```

**Query Parameters**:
- `limit`: Số lượng (mặc định: 10, tối đa: 50)
- `days`: Số ngày gần đây (mặc định: 30, tối đa: 365)

---

## 13. Kiểm duyệt đánh giá (Admin/Moderator)

### POST /api/reviews/reviews/:reviewId/moderate
**Mô tả**: Kiểm duyệt đánh giá (approve/reject/flag)

**Headers**:
```
X-User-Id: 507f1f77bcf86cd799439011
X-User-Role: admin
Content-Type: application/json
```

**Request**:
```
POST http://localhost:3009/api/reviews/reviews/65a1b2c3d4e5f6g7h8i9j0k1/moderate
```

**Request Body**:
```json
{
  "action": "approve",
  "reason": "Đánh giá hợp lệ"
}
```

**Actions hợp lệ**: `approve`, `reject`, `flag`

---

## 14. Lấy danh sách chờ duyệt (Admin/Moderator)

### GET /api/reviews/moderation/pending
**Mô tả**: Lấy danh sách đánh giá chờ duyệt

**Headers**:
```
X-User-Id: 507f1f77bcf86cd799439011
X-User-Role: admin
```

**Request**:
```
GET http://localhost:3009/api/reviews/moderation/pending?page=1&limit=10
```

---

## Lỗi thường gặp

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Yêu cầu đăng nhập để thực hiện hành động này",
  "code": "UNAUTHORIZED"
}
```

**Nguyên nhân**: Chỉ xảy ra trong môi trường production khi không có userId.

**Giải pháp** (chỉ cần trong production):

**Trong Development**: Service tự động tạo userId, không cần làm gì!

**Trong Production**: Cần gửi userId qua một trong các cách:
1. Header: `x-user-id: 507f1f77bcf86cd799439011`
2. Body: `"userId": "507f1f77bcf86cd799439011"`
3. Query: `?userId=507f1f77bcf86cd799439011`

### 403 Forbidden
```json
{
  "success": false,
  "message": "Bạn không có quyền truy cập tính năng này",
  "code": "FORBIDDEN"
}
```
**Giải pháp**: Thêm header `x-user-role: admin` hoặc `moderator` (chữ thường)

### 400 Validation Error
```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "code": "VALIDATION_ERROR",
  "errors": [...]
}
```
**Giải pháp**: Kiểm tra lại dữ liệu request body

### 429 Rate Limit
```json
{
  "success": false,
  "message": "Bạn đang gửi đánh giá quá nhanh. Vui lòng thử lại sau 15 phút.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```
**Giải pháp**: Đợi 15 phút hoặc giảm số lượng request

---

## Collection Postman

Bạn có thể import collection này vào Postman:

1. Tạo collection mới tên "Review Service"
2. Tạo environment với biến:
   - `base_url`: `http://localhost:3009`
   - `user_id`: `507f1f77bcf86cd799439011`
   - `user_role`: `user`
   - `admin_role`: `admin`
   - `driver_id`: `507f1f77bcf86cd799439012`
   - `review_id`: (sẽ được set sau khi tạo review)

3. **Cách sử dụng biến trong Header:**
   - Trong tab Headers, thêm header:
     - Key: `x-user-id`
     - Value: `{{user_id}}` (sử dụng cú pháp `{{variable_name}}`)

4. **Hoặc set Collection-level Headers:**
   - Vào Collection Settings → Variables
   - Thêm header mặc định: `x-user-id` với value `{{user_id}}`
   - Tất cả requests trong collection sẽ tự động có header này

---

## Test Flow đề xuất

1. **Health Check** → Kiểm tra service đang chạy
2. **Tạo đánh giá** → Tạo một đánh giá mới
3. **Lấy đánh giá** → Kiểm tra đánh giá vừa tạo
4. **Lấy thống kê** → Xem thống kê của subject
5. **Vote hữu ích** → Test tính năng vote
6. **Thêm phản hồi** → Test phản hồi từ driver/company
7. **Cập nhật đánh giá** → Test chỉnh sửa (trong 24h)
8. **Lấy trending** → Xem trending reviews
9. **Admin: Kiểm duyệt** → Test moderation (nếu có quyền admin)

---

## Lưu ý

- Tất cả ID phải là MongoDB ObjectId hợp lệ
- Rating phải là số nguyên từ 1-5
- Comment tối đa 1200 ký tự
- Title tối đa 200 ký tự
- Rate limit: 5 requests/15 phút cho tạo đánh giá
- Chỉ có thể chỉnh sửa đánh giá trong 24 giờ đầu

