# CAB Booking System — Requirements Gap (from PDF)

Nguồn yêu cầu: [docs/CAB-BOOKING-SYSTEM.extracted.txt](CAB-BOOKING-SYSTEM.extracted.txt)

Legend:
- ✅ Done: đã có end-to-end (API + integration)
- 🟡 Partial: có code nhưng chưa wired / còn placeholder
- ❌ Missing: chưa có hoặc chỉ là stub

## 1) Security / Zero Trust
**PDF yêu cầu** (client/edge + gateway + nội bộ): TLS/WAF/rate limit, gateway là PEP (JWT/OAuth2 + role/scope/permission + schema validation), service-to-service mTLS qua service mesh, RBAC + ABAC.  
Bằng chứng: [Gateway/Edge/mTLS/RBAC/ABAC](CAB-BOOKING-SYSTEM.extracted.txt#L160-L226)

**Repo hiện trạng**
- 🟡 API Gateway có JWT validation qua Auth Service (middleware gọi `/auth/validate-token`) nhưng chưa enforce permission/scope và chưa có request schema validation.
  - Gateway routes + auth middleware: [api-gateway/src/app.js](../api-gateway/src/app.js#L1-L131), [api-gateway/src/middlewares/auth.middleware.js](../api-gateway/src/middlewares/auth.middleware.js)
- 🟡 Rate limit: dependency có nhưng chưa apply tại gateway.
  - Dependency: [api-gateway/package.json](../api-gateway/package.json#L1-L40)
- ❌ WAF/TLS1.3/mTLS/service-mesh: chưa có cấu hình triển khai trong docker-compose / k8s manifests.
- 🟡 RBAC trong 1 số service có nhắc tới role (vd ride-service, review-service) nhưng ABAC theo ngữ cảnh (vd “driver chỉ update GPS khi ride ACTIVE”) chưa có flow GPS update để enforce.

## 2) Real-time GPS Update (Driver → Passenger)
**PDF yêu cầu**: driver gửi GPS qua WebSocket, Ride Service cập nhật Redis Geo index, publish event, passenger nhận <1s latency.  
Bằng chứng: [Real-time GPS Update](CAB-BOOKING-SYSTEM.extracted.txt#L388-L409)

**Repo hiện trạng**
- ❌ Socket server đang chỉ là Express healthcheck, chưa khởi tạo Socket.IO/WebSocket.
  - [realtime/socket-server/src/index.js](../realtime/socket-server/src/index.js#L1-L25)
- 🟡 Có module GPS tracker khá đầy đủ (Redis GEO + broadcast), nhưng chưa được wired vào server entrypoint.
  - [realtime/socket-server/src/gpsTracker.js](../realtime/socket-server/src/gpsTracker.js)
- ❌ Ride Service chưa cập nhật Redis Geo index / publish event từ GPS update.

## 3) AI Driver Matching
**PDF yêu cầu**: Redis Geo lọc hard constraint + AI matching service (soft constraints/scoring), publish qua Kafka, fallback rule-based khi AI lỗi.  
Bằng chứng: [AI Driver Matching](CAB-BOOKING-SYSTEM.extracted.txt#L410-L429)

**Repo hiện trạng**
- ❌ Không có AI matching service chạy thực tế; ride-service hiện nhận driver assignment “được đưa vào sẵn”, chưa có pipeline tìm/đề xuất tài xế.
- ❌ Kafka integration không thấy được sử dụng trong codebase.

## 4) Pricing / Surge pricing
**PDF yêu cầu**: surge pricing (AI) + xử lý failure (fallback rule, price snapshot theo booking).  
Bằng chứng: [Pricing failure cases](CAB-BOOKING-SYSTEM.extracted.txt#L850-L876)

**Repo hiện trạng**
- ❌ Pricing API đang là placeholder trả baseFare cố định.
  - [services/pricing-service/src/app.js](../services/pricing-service/src/app.js#L1-L49)
- 🟡 Có AI pricing engine code (ml-regression) nhưng chưa được dùng bởi endpoint.
  - [services/pricing-service/src/ai/pricingEngine.js](../services/pricing-service/src/ai/pricingEngine.js)

## 5) Payment (Saga + Retry/Backoff + Idempotency)
**PDF yêu cầu**: retry + exponential backoff, payment là source-of-truth, saga choreography event-driven, tránh double-charge, idempotency key cho duplicate/retry.  
Bằng chứng: [Payment retry/backoff](CAB-BOOKING-SYSTEM.extracted.txt#L430-L450), [Failure scenarios: idempotency/double charge](CAB-BOOKING-SYSTEM.extracted.txt#L850-L909)

**Repo hiện trạng**
- 🟡 Có saga choreography dựa RabbitMQ consume `booking.created`, có upsert theo `rideId` để tránh duplicate message.
  - [services/payment-service/src/saga/paymentSaga.js](../services/payment-service/src/saga/paymentSaga.js)
- 🟡 Retry trong model có (nextRetryAt), nhưng chưa thấy exponential backoff “đúng nghĩa” end-to-end, và chưa có idempotency key ở HTTP layer.
- 🟡 HTTP API payment hiện chủ yếu là route test (`/test-order`) + get by paymentId; chưa có API contract đầy đủ cho customer app.
  - [services/payment-service/src/app.js](../services/payment-service/src/app.js#L1-L120)

## 6) Resilience / Failure handling patterns
**PDF yêu cầu**: circuit breaker, retry/timeout, graceful degradation, bulkhead, idempotency…  
Bằng chứng: [Resilience patterns](CAB-BOOKING-SYSTEM.extracted.txt#L250-L307), [Failure handling patterns](CAB-BOOKING-SYSTEM.extracted.txt#L900-L909)

**Repo hiện trạng**
- 🟡 Có code ServiceRouter/circuit breaker trong gateway nhưng không được dùng trong app routing hiện tại.
  - [api-gateway/src/serviceRouter.js](../api-gateway/src/serviceRouter.js)
- ❌ Chưa có DLQ/poison-message handling rõ ràng; retries/backoff chủ yếu là đơn lẻ.

## 7) OpenAPI (FULL all services)
**PDF yêu cầu**: OpenAPI 3.0 YAML đầy đủ tất cả services, import được Swagger/Postman.  
Bằng chứng: [Phụ lục OpenAPI FULL](CAB-BOOKING-SYSTEM.extracted.txt#L1118-L1124)

**Repo hiện trạng**
- 🟡 Chỉ thấy review-service có OpenAPI yaml.
  - [services/review-service/docs/api-spec.yaml](../services/review-service/docs/api-spec.yaml)
- ❌ Chưa có OpenAPI cho auth/user/driver/booking/ride/payment/pricing/notification + chưa có swagger UI/aggregation ở gateway.

## 8) Observability (metrics/logs/tracing)
**PDF yêu cầu**: Prometheus+Grafana, ELK/OpenSearch, Jaeger tracing…  
Bằng chứng: [Observability stack](CAB-BOOKING-SYSTEM.extracted.txt#L980-L1010)

**Repo hiện trạng**
- ❌ docker-compose chưa có Prometheus/Grafana/ELK/Jaeger.
- 🟡 Có morgan logging rải rác, nhưng chưa có centralized logging/tracing.

## 9) CI/CD + Cloud-native deployment
**PDF yêu cầu**: cloud-native Docker + orchestration + CI/CD (GitHub Actions).  
Bằng chứng: [Mục tiêu cloud-native](CAB-BOOKING-SYSTEM.extracted.txt#L70-L96), [DevOps stack](CAB-BOOKING-SYSTEM.extracted.txt#L980-L999)

**Repo hiện trạng**
- ✅ Docker Compose có.
- ❌ Không thấy GitHub Actions workflows.
- ❌ Không có Kubernetes manifests/Helm/Terraform.

## 10) Clients (Customer / Driver / Admin)
**PDF yêu cầu**: RBAC roles Customer/Driver/Admin; luồng driver/passenger/admin tương ứng.

**Repo hiện trạng**
- ✅ Customer app có.
- ❌ Driver app và admin dashboard folders đang trống.
  - [clients/driver-app](../clients/driver-app)
  - [clients/admin-dashboard](../clients/admin-dashboard)

---

## Suggested priority order (practical)
1) Wire real-time socket server + GPS flow end-to-end (socket-server + ride-service + redis + gateway route)
2) Hoàn thiện pricing `/estimate` dùng pricingEngine + “price snapshot theo booking”
3) Hoàn thiện payment HTTP API + idempotency key + retry/backoff logic
4) Add gateway rate limiting + request schema validation + role enforcement
5) OpenAPI cho toàn bộ services + swagger UI
6) Observability stack (Prometheus/Grafana + centralized logging)
7) CI/CD workflows
