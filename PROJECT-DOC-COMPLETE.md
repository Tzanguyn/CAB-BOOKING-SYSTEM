# BÁO CÁO ĐỒ ÁN - CAB BOOKING SYSTEM

**Môn học:** Modern System Architecture Design for Large Demands  
**Chuyên ngành:** Hệ Thống Thông Tin – Đại Học IUH  
**Công nghệ:** Microservices – Real-time – Event-driven – AI-enabled – Zero Trust Architecture

---

## 1. Đặt vấn đề (Problem and Scope)

Trong bối cảnh nhu cầu di chuyển đô thị ngày càng tăng cao tại Việt Nam, các hệ thống đặt xe taxi truyền thống đang bộc lộ nhiều hạn chế nghiêm trọng: không đáp ứng được lưu lượng người dùng lớn trong giờ cao điểm, thiếu khả năng định vị GPS và ghép đôi tài xế thời gian thực, quy trình thanh toán thủ công dễ xảy ra sai sót, mức độ bảo mật thấp và khó mở rộng quy mô.

Hệ thống **CAB Booking System** được thiết kế nhằm giải quyết toàn diện các vấn đề trên bằng cách áp dụng kiến trúc **Microservices – Real-time – Event-driven – AI-enabled – Zero Trust Architecture**, hướng đến xây dựng một nền tảng cloud-native, có khả năng mở rộng linh hoạt, độ tin cậy cao, xử lý thời gian thực và tích hợp trí tuệ nhân tạo.

**Phạm vi nghiên cứu:**
- Ba nhóm người dùng: Hành khách (Customer), Tài xế (Driver), Quản trị viên (Admin)
- Chức năng cốt lõi: đặt xe, ghép đôi thông minh bằng AI, theo dõi GPS thời gian thực, thanh toán an toàn, đánh giá chuyến đi
- Triển khai trên Docker/Kubernetes, đảm bảo high availability, scalability và bảo mật Zero Trust

---

## 2. Thu thập yêu cầu và khảo sát nghiệp vụ

### 2.1. Yêu cầu chức năng (Functional Requirements)

| Actor | Chức năng chính |
|-------|----------------|
| Hành khách | Đăng ký/đăng nhập, đặt xe, chọn loại xe & giá, theo dõi chuyến đi real-time, thanh toán, đánh giá |
| Tài xế | Đăng ký KYC, bật/tắt trạng thái online, nhận chuyến, cập nhật GPS, hoàn thành chuyến đi, xem thu nhập |
| Quản trị viên | Giám sát real-time, quản lý người dùng/tài xế/chuyến đi, cấu hình surge pricing, xem báo cáo |

### 2.2. Yêu cầu phi chức năng (Non-Functional Requirements)

- **Scalability**: Horizontal Pod Autoscaling (HPA), multi-region
- **Real-time**: WebSocket kết hợp RabbitMQ với độ trễ dưới 1 giây
- **High Availability & Fault Tolerance**: Không có SPOF, Circuit Breaker, Retry, Saga Pattern
- **Security**: Zero Trust Architecture (mTLS, JWT + Refresh Token, RBAC/ABAC)
- **Observability**: Prometheus, Grafana, Jaeger
- **Cloud-native**: Docker + Kubernetes + Terraform + GitHub Actions

### 2.3. Khảo sát nghiệp vụ

Hệ thống được thiết kế dựa trên mô hình kinh doanh của các nền tảng đặt xe lớn (Uber, Grab, Be) nhưng được nâng cấp theo tiêu chuẩn hiện đại.

---

## 3. Phân tích Domain-Driven Design

### 3.1. Actors & Use Cases

**Actors:** Customer, Driver, Admin, AI Matching Service, Payment Gateway (Stripe), Map Service  
**Use Cases chính:** Login & Refresh Token, Request Ride, AI Driver Matching, Real-time GPS Update, Surge Pricing, ETA Calculation, Payment với Saga Pattern, Rating & Feedback

### 3.2. Domain, Bounded Context & Microservices

| Bounded Context | Microservice | Database |
|----------------|-------------|----------|
| Auth Context | Auth Service (port 3004) | PostgreSQL + Redis |
| Customer Context | User Service (port 3005) | MongoDB |
| Driver Context | Driver Service (port 3007) | PostgreSQL + MongoDB + Redis |
| Booking Context | Booking Service (port 3003) | PostgreSQL + MongoDB |
| Ride Context | Ride Service (port 3009) | PostgreSQL + MongoDB |
| Matching Context (AI) | Matching Service (port 3014) | Redis |
| Pricing Context | Pricing Service (port 3001) | PostgreSQL + Redis |
| ETA Context | ETA Service (port 3011) | Redis |
| Payment Context | Payment Service (port 3002) | PostgreSQL |
| Notification Context | Notification Service (port 3008) | MongoDB |
| Fraud Context | Fraud Service (port 3012) | - |
| Review Context | Review Service (port 3006) | MongoDB |

### 3.3. Context Mapping

- **Customer → Booking**: REST đồng bộ qua API Gateway
- **Booking → Matching → Ride**: Bất đồng bộ qua RabbitMQ (event-driven)
- **Ride ↔ Pricing/ETA**: Query đồng bộ hoặc qua Redis Cache
- **Ride → Payment**: Saga choreography-based
- **Tất cả → Notification**: Publish event qua RabbitMQ
- **Real-time GPS**: WebSocket Gateway + Redis Geo

---

## 4. Thiết kế kiến trúc hệ thống (SAD)

### 4.1. Kiến trúc tổng thể

Hệ thống gồm bốn tầng chính:

```
Client Layer          → Customer App, Driver App, Admin Dashboard (React/Next.js)
API Gateway Layer     → Điểm vào duy nhất, Zero Trust (JWT, rate limiting, WAF)
Microservices Layer   → 12 services độc lập, giao tiếp REST + RabbitMQ
Data & Infra Layer    → PostgreSQL, MongoDB, Redis, RabbitMQ
```

### 4.2. Kiến trúc triển khai

- Docker Compose với 4 profiles: `base`, `development`, `production`, `full`
- Kubernetes manifests + HPA + Kustomize
- Terraform IaC cho AWS infrastructure
- CI/CD qua GitHub Actions

### 4.3. Kiến trúc Real-time & Event-driven

- **WebSocket Gateway** (Socket.IO) kết nối trực tiếp Customer App và Driver App
- **RabbitMQ** làm backbone cho tất cả sự kiện hệ thống (5 topic exchanges, 9+ queues)
- **Redis GeoIndex** cho vị trí tài xế (query < 10ms)
- Latency mục tiêu: < 1 giây cho GPS update và notification

### 4.4. Kiến trúc AI & Intelligent Services

AI được tách thành tầng riêng biệt để không ảnh hưởng đến luồng chính:
- **AI Driver Matching**: Redis Geo (hard filter) + ML scoring (soft scoring)
- **Surge Pricing Model**: Tính giá động theo cung-cầu, thời gian, khu vực, thời tiết
- **ETA Prediction**: Sử dụng traffic data và lịch sử GPS
- **Fraud Detection**: Phân tích hành vi bất thường

### 4.5. Kiến trúc bảo mật – Zero Trust

Nguyên tắc "Never trust, always verify" áp dụng xuyên suốt:
- **Client & Edge**: HTTPS/TLS, Rate Limiting, Device Fingerprinting
- **API Gateway**: Policy Enforcement Point – JWT validation, RBAC/ABAC, Schema Validation
- **Service-to-Service**: mTLS qua Service Mesh (Istio/Linkerd)
- **Data Security**: Encryption at-rest & in-transit, Redis token blacklist

---

## 5. Các mẫu thiết kế phần mềm (Design Patterns)

Hệ thống áp dụng nhiều design patterns quan trọng trong kiến trúc microservices:

### 5.1. API Gateway Pattern

API Gateway (`api-gateway/src/app.js`) đóng vai trò single entry point, thực hiện: request routing, authentication, rate limiting, load balancing và circuit breaking. Mọi request từ client đều đi qua Gateway trước khi đến microservices.

### 5.2. Saga Pattern (Choreography-based)

Áp dụng cho luồng Payment (`services/payment-service/src/saga/paymentSaga.js`). Thay vì distributed transaction (2PC), hệ thống sử dụng saga choreography qua RabbitMQ events:

- **Bước 1**: Booking Service publish `booking.created` event
- **Bước 2**: Payment Service consume event, tạo payment với atomic upsert (tránh duplicate)
- **Bước 3**: Chạy saga steps (deduct_balance) với compensation action (refund)
- **Bước 4**: Publish `payment.succeeded` hoặc trigger compensation khi lỗi

### 5.3. Circuit Breaker Pattern

Triển khai trong `api-gateway/src/serviceRouter.js` với cấu hình: failureThreshold=5, recoveryTimeout=60s. Khi service lỗi liên tục, circuit breaker mở ra để ngăn cascade failure, tự động đóng lại khi service phục hồi.

### 5.4. Bulkhead Pattern

Triển khai trong `shared/middleware/bulkhead.js`. Giới hạn concurrent requests (maxConcurrent=10, maxQueueDepth=50) với timeout protection, ngăn chặn một service bị overload ảnh hưởng đến toàn hệ thống.

### 5.5. Retry + Exponential Backoff

Triển khai trong `shared/utils/retryPolicy.js` với jitter để tránh thundering herd. Công thức: `delay = min(maxDelay, initialDelay × multiplier^(attempt-1)) ± jitter`. Áp dụng cho: Booking→Payment init, Payment saga RabbitMQ reconnect.

### 5.6. Các Pattern khác

| Pattern | Áp dụng | File tham chiếu |
|---------|---------|-----------------|
| Database per Service | Mỗi service có DB riêng | `docker-compose.yml` |
| Event-driven (Pub/Sub) | RabbitMQ exchanges & consumers | `paymentSaga.js`, `matchingConsumer.js` |
| Repository Pattern | Models trong mỗi service | `services/*/src/models/` |
| Middleware Chain | Express middleware pipeline | `api-gateway/src/app.js` |
| Dead Letter Queue | Xử lý poison messages | `shared/utils/dlqManager.js` |

---

## 6. Tối ưu kiến trúc giao dịch (Transaction Process)

### 6.1. Thách thức giao dịch trong Microservices

Trong kiến trúc microservices, không thể sử dụng global transaction (2PC) vì mỗi service có database riêng. Hệ thống áp dụng các pattern sau:

### 6.2. Saga Pattern cho Payment Flow

Luồng giao dịch chính: **Booking → Pricing → Payment → Notification**

```
User đặt xe → Booking Service tạo booking (status=REQUESTED)
  → Publish "booking.created" lên RabbitMQ
  → Payment Service consume event
  → Atomic upsert (findOneAndUpdate với $setOnInsert) tránh duplicate
  → Chạy saga steps → Thành công: publish "payment.succeeded"
                     → Thất bại: trigger compensation (refund + cancel booking)
```

### 6.3. Idempotency Key

Booking Service sử dụng idempotency key để tránh duplicate booking khi client retry. Payment Service sử dụng `rideId` làm unique constraint với atomic upsert – nếu đã tồn tại payment cho rideId, không tạo mới.

### 6.4. Exponential Backoff + Jitter

Áp dụng trên các path quan trọng:
- **Booking → Payment init**: retry với retryable-error classifier
- **Payment saga RabbitMQ reconnect**: initialDelay=2s, maxDelay=30s, multiplier=2, jitter=15%
- **Pricing service timeout**: retry 2 lần trước khi fallback giá mặc định

### 6.5. Dead Letter Queue (DLQ)

Messages thất bại sau 3 lần retry được chuyển vào DLQ. DLQ Manager (`shared/utils/dlqManager.js`) phát hiện poison messages và đánh dấu để xử lý thủ công, tránh block consumer queue.

### 6.6. Đảm bảo tính nhất quán (Consistency)

- **Atomicity**: Atomic upsert trong MongoDB, PostgreSQL transactions trong auth/payment
- **Consistency**: Saga compensation đảm bảo rollback khi lỗi giữa chừng
- **Isolation**: Idempotency key + atomic operations tránh race condition
- **Durability**: RabbitMQ durable queues + persistent messages đảm bảo không mất event

---

## 7. Ứng dụng AI (AI / AI Agent Pipeline)

### 7.1. AI Driver Matching

**Matching Service** (`services/matching-service/src/app.js`) triển khai thuật toán ghép đôi tài xế thông minh theo 2 giai đoạn:

**Giai đoạn 1 – Hard Filter (Redis Geo):**
- Query tài xế gần nhất trong bán kính (mặc định 5km) bằng Redis GeoIndex
- Loại bỏ tài xế offline (status ≠ ONLINE)

**Giai đoạn 2 – Soft Scoring (ML-based):**
- **Distance Score** = max(0, 100 - distance × 12) – ưu tiên tài xế gần
- **Rating Score** = max(0, rating × 18) – ưu tiên tài xế rating cao
- **Demand Boost** = demandIndex × 4 – điều chỉnh theo nhu cầu
- **Online Bonus** = 30 điểm cho tài xế đang online
- Trả về top-N drivers (mặc định 3) sorted theo tổng điểm

**Fallback:** Khi matching service lỗi, trả về synthetic drivers để booking flow không bị gián đoạn.

### 7.2. AI Surge Pricing Engine

**Pricing Engine** (`services/pricing-service/src/ai/pricingEngine.js`) tính giá động dựa trên nhiều yếu tố:

| Yếu tố | Multiplier | Ví dụ |
|---------|-----------|-------|
| Demand level | 0.9 – 2.5x | extreme demand = 2.5x |
| Supply level | 0.95 – 2.0x | scarce supply = 2.0x |
| Thời gian | 1.0 – 1.3x | giờ cao điểm = 1.2x, đêm khuya = 1.3x |
| Thời tiết | 1.0 – 1.8x | mưa lớn = 1.5x |
| Khu vực | 1.0 – 1.2x | sân bay = 1.2x |
| Giao thông | 1.0 – 1.6x | kẹt xe nghiêm trọng = 1.6x |

**Công thức:** `totalFare = baseFare × surge × location × time × weather × traffic + specialRequests - loyaltyDiscount`

Surge cap tại 3.0x, giá tối thiểu theo loại xe (standard: 15,000 VND, premium: 25,000 VND).

**ML Training:** Engine hỗ trợ train model từ historical data bằng Polynomial Regression (ml-regression library). Khi model chưa train hoặc lỗi, tự động fallback sang rule-based pricing.

### 7.3. ETA Prediction & Fraud Detection

- **ETA Service** (`services/eta-service/`): Dự đoán thời gian đến dựa trên khoảng cách, traffic level. Fallback sang ước tính đơn giản khi model lỗi.
- **Fraud Service** (`services/fraud-service/`): Phân tích hành vi bất thường dựa trên user_id, amount, location, device_fingerprint. Trả về fraud_score và flag.

### 7.4. ML Lifecycle Governance

Hệ thống có pipeline ML lifecycle hoàn chỉnh:
- **Train**: `scripts/ml/train-pricing-model.js` – huấn luyện pricing model
- **Register**: `scripts/ml/register-pricing-model.js` – đăng ký model vào registry
- **Validate**: `scripts/ci/validate-ml-lifecycle.js` – kiểm tra tính hợp lệ trong CI
- **Registry**: `models/pricing/registry.json` – quản lý model versions

---

## 8. Giám sát hệ thống (System Monitor)

### 8.1. Stack Observability

Hệ thống triển khai đầy đủ ba trụ cột observability:

| Thành phần | Công nghệ | Chức năng |
|------------|-----------|-----------|
| Metrics | Prometheus + Grafana | Thu thập và hiển thị request_count, latency, error_rate |
| Logging | Structured JSON logs | Ghi log với timestamp, service_name, request_id, trace_id |
| Tracing | Jaeger | Distributed tracing xuyên suốt các service |

### 8.2. Health Check & SLO Monitoring

Mọi service đều expose `/health` endpoint và `/metrics` endpoint cho Prometheus scrape. SLO monitor (`shared/utils/slo.js`) theo dõi:
- **P95 Latency** < 500ms (cấu hình theo service)
- **Success Rate** > 99%

### 8.3. Cấu hình Prometheus

```yaml
# observability/prometheus/prometheus.yml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: cab-booking-gateway
    metrics_path: /metrics
    static_configs:
      - targets: [api-gateway:3000]
```

### 8.4. Alerting

- Service down → immediate alert
- Error rate > 5% → warning alert  
- Latency spike (P95 > 500ms) → performance alert
- RabbitMQ queue backlog → queue alert

---

## 9. Bảo mật hệ thống và dữ liệu (Information Security)

### 9.1. Zero Trust Architecture

Hệ thống tuân thủ nguyên tắc "Never trust, always verify" với 5 tầng bảo mật:

**Tầng 1 – Client & Edge:**
- HTTPS/TLS bắt buộc, Helmet security headers
- Rate limiting: chống DDoS, HTTP 429 khi vượt threshold

**Tầng 2 – API Gateway (Policy Enforcement Point):**
- JWT validation cho mọi request (trừ auth/register, auth/login)
- Schema validation cho input (auth/register, booking create, payment)
- Scope-based permission middleware (opt-in qua `ENFORCE_GATEWAY_SCOPES`)

**Tầng 3 – Authentication & Authorization:**
- RBAC: 3 roles (customer, driver, admin) với middleware `authorize([roles])`
- ABAC: Self-or-admin check – user chỉ truy cập data của chính mình
- JWT ngắn hạn (15m) + Refresh Token (7d) với rotation

**Tầng 4 – Service-to-Service:**
- mTLS manifests (`k8s/security/peer-authentication-mtls.yaml`)
- Authorization Policy cho internal traffic (`k8s/security/authorization-policy.yaml`)
- Network Policy isolation giữa các services

**Tầng 5 – Data Security:**
- Token blacklist bằng Redis (logout invalidation)
- Bcrypt password hashing
- Database-per-service isolation

### 9.2. Xử lý các tấn công phổ biến

| Tấn công | Cơ chế phòng thủ |
|----------|-------------------|
| SQL Injection | Parameterized queries (Prisma/Mongoose) |
| XSS | Helmet headers, input sanitization |
| JWT Tampering | Signature verification, reject tampered tokens |
| Brute-force | Rate limiting, failed attempts tracking |
| Replay Attack | Idempotency key, token expiration |
| Unauthorized Access | RBAC/ABAC enforcement, HTTP 403 |

---

## 10. Cài đặt và triển khai (CI/CD)

### 10.1. Docker Containerization

Toàn bộ 12 microservices + infrastructure được container hóa bằng Docker. File `docker-compose.yml` quản lý 4 profiles:

| Profile | Services | Mục đích |
|---------|----------|----------|
| `base` | PostgreSQL, MongoDB, Redis, RabbitMQ | Infrastructure cơ bản |
| `development` | base + tất cả microservices + API Gateway | Development với hot reload |
| `production` | development + realtime socket | Production |
| `full` | production + Customer App + Driver App + Admin Dashboard | Full system |

### 10.2. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
jobs:
  compliance-gate:    # Cloud-native & security compliance
  manifests-lint:     # Validate Kubernetes manifests
```

Pipeline bao gồm: compliance check, OpenAPI validation, realtime smoke test, Kubernetes manifest linting.

### 10.3. Kubernetes Deployment

- **Base manifests**: `k8s/base/` với Kustomize overlay
- **HPA (Horizontal Pod Autoscaler)**: Auto-scale theo CPU/Memory
- **Security manifests**: `k8s/security/` (mTLS, Authorization Policy, Network Policy)

### 10.4. Infrastructure as Code (Terraform)

- **Single-region**: `infra/terraform/main.tf` – AWS ECS/EKS infrastructure
- **Multi-region**: `infra/terraform/multi-region/` – Global routing + failover

---

## 11. Tối ưu hóa hệ thống (System Scalability)

### 11.1. Horizontal Scaling

- **Kubernetes HPA**: Auto-scale pods dựa trên CPU/Memory metrics
- **Docker Compose scaling**: `docker-compose up -d --scale api-gateway=3`
- **Stateless services**: Mọi service đều stateless, dễ dàng scale ngang

### 11.2. Caching Strategy (Redis)

- **GPS GeoIndex**: Redis Geo cho query vị trí tài xế (< 10ms)
- **Token blacklist**: Redis cho JWT revocation (< 1ms lookup)
- **Session cache**: Giảm tải database cho repeated queries
- **Mục tiêu**: Cache hit rate > 90%

### 11.3. Event-driven Async Processing

RabbitMQ decouple các services, cho phép:
- Booking flow không bị block bởi Payment/Notification
- Scale consumer independently theo workload
- Buffer events khi downstream service bị overload

### 11.4. Database Optimization

- **Database-per-service**: Mỗi service scale DB độc lập
- **PostgreSQL**: Cho transactional data (auth, payment, booking)
- **MongoDB**: Cho document data (users, rides, reviews) – dễ shard
- **Redis**: Cho real-time data (GPS, cache, sessions) – cluster mode

### 11.5. Performance Targets

| Metric | Target | Cơ chế đạt được |
|--------|--------|-----------------|
| API response P95 | < 300ms | Redis cache, async processing |
| GPS update latency | < 1s | WebSocket + Redis Geo |
| Booking throughput | 1000 req/s | HPA, load balancing |
| Cache hit rate | > 90% | Redis với TTL strategy |
| System availability | 99.9% | Multi-region, Circuit Breaker |

---

## 12. Kết luận

### 12.1. Kết quả đạt được

Hệ thống CAB Booking System đã được xây dựng hoàn chỉnh với:

- **12 microservices** hoạt động độc lập, giao tiếp qua REST và RabbitMQ
- **Kiến trúc event-driven** với Saga Pattern đảm bảo eventual consistency
- **AI services** cho driver matching, surge pricing, ETA prediction, fraud detection
- **Real-time GPS tracking** với WebSocket + Redis Geo (latency < 1s)
- **Zero Trust Security** với JWT, RBAC/ABAC, rate limiting, mTLS manifests
- **Observability stack** với Prometheus, Grafana, Jaeger, structured logging
- **CI/CD pipeline** với GitHub Actions, Docker, Kubernetes, Terraform
- **3 client applications**: Customer App, Driver App, Admin Dashboard
- **Kiểm thử tự động** với 121 test cases trải dài 12 levels

### 12.2. Đánh giá theo tiêu chí chất lượng

| Thuộc tính | Giải pháp | Đánh giá |
|------------|-----------|----------|
| Scalability | Microservices, HPA, Event-driven | ✅ Đạt |
| Availability | Multi-region, Circuit Breaker, Retry | ✅ Đạt |
| Performance | Redis cache, async processing, WebSocket | ✅ Đạt |
| Security | Zero Trust, JWT, mTLS, RBAC | ✅ Đạt |
| Maintainability | Service isolation, API contract, CI/CD | ✅ Đạt |
| Resilience | Saga, Bulkhead, DLQ, Fallback | ✅ Đạt |

### 12.3. Hạn chế và hướng phát triển

**Hạn chế hiện tại:**
- ML models chưa được train trên production data thực tế
- mTLS chưa được enforce runtime trên cluster thực
- Chưa có full KYC/earning flow cho driver

**Hướng phát triển:**
- Mở rộng ML lifecycle sang matching/fraud/ETA models
- Triển khai service mesh (Istio) cho mTLS runtime enforcement
- Tích hợp payment gateway thực tế (VNPay, MoMo)
- Xây dựng data pipeline cho analytics và AI training

### 12.4. Bài học kinh nghiệm

Qua quá trình xây dựng hệ thống, nhóm rút ra các bài học quan trọng:
1. **Kiến trúc microservices** đòi hỏi đầu tư lớn vào infrastructure (message broker, service discovery, monitoring) nhưng mang lại khả năng scale và maintain tốt hơn
2. **Event-driven architecture** giải quyết hiệu quả vấn đề coupling giữa services nhưng cần cơ chế xử lý failure mạnh mẽ (DLQ, idempotency, compensation)
3. **Zero Trust Security** không chỉ là authentication mà còn bao gồm authorization, encryption, audit logging ở mọi tầng
4. **AI integration** cần có fallback mechanism rõ ràng để hệ thống vẫn hoạt động khi AI service lỗi
