# CAB Booking System - Requirements Gap (from PDF)

Nguon yeu cau: [docs/CAB-BOOKING-SYSTEM.extracted.txt](CAB-BOOKING-SYSTEM.extracted.txt)

Legend:
- [DONE]: da co implementation end-to-end (API + integration)
- [PARTIAL]: da co mot phan, nhung chua full production-grade
- [GAP]: chua co hoac moi o muc y tuong

## 1) Security / Zero Trust
PDF yeu cau: TLS/WAF/rate limit o edge, gateway la PEP (JWT/OAuth2 + role/scope/permission + schema validation), service-to-service mTLS qua service mesh, RBAC + ABAC.

Repo hien trang:
- [DONE] Gateway co JWT validation, rate limit, helmet, route-level schema validation (auth/register-login, booking create, payment create/confirm), role checks, va self-or-admin ABAC-like checks.
  - [api-gateway/src/app.js](../api-gateway/src/app.js)
- [DONE] Gateway da co scope-based permission middleware (opt-in qua `ENFORCE_GATEWAY_SCOPES=true`) de enforce theo namespace `users/bookings/payments/...`.
  - [api-gateway/src/app.js](../api-gateway/src/app.js)
- [DONE] RBAC middleware da co trong auth-service va da duoc ap vao profile/logout routes.
  - [services/auth-service/src/middlewares/authMiddleware.js](../services/auth-service/src/middlewares/authMiddleware.js)
  - [services/auth-service/src/routes/authRoutes.js](../services/auth-service/src/routes/authRoutes.js)
- [PARTIAL] mTLS/network-policy/authorization manifests da co va da duoc include vao base kustomization, va ingress da duoc harden them voi TLS/HSTS/ModSecurity annotations.
  - [k8s/base/kustomization.yaml](../k8s/base/kustomization.yaml)
  - [k8s/security/peer-authentication-mtls.yaml](../k8s/security/peer-authentication-mtls.yaml)
  - [k8s/security/authorization-policy.yaml](../k8s/security/authorization-policy.yaml)
- [PARTIAL] **PHASE 4 (Apr 2026)**: da co smoke check cho mesh/security posture (artifact + runtime endpoint) va cluster-runtime verification theo che do optional.
  - [scripts/phase4-client-mesh-smoke.js](../scripts/phase4-client-mesh-smoke.js)
- [GAP] Chua co bang chung runtime service-mesh control plane enforcement tren cluster that (kubectl/mesh control-plane canh tranh truong local).
- [PARTIAL] Edge enforcement da co NGINX TLS/HSTS/OWASP CRS annotations, nhung WAF/mesh control plane and production cert management van can cluster-level rollout.

## 2) Real-time GPS Update (Driver -> Passenger)
PDF yeu cau: driver gui GPS qua WebSocket, Ride Service cap nhat Redis Geo index, publish event, passenger nhan <1s latency.

Repo hien trang:
- [DONE] Socket.IO flow da wired: join/leave ride room, driver location update, ride broadcast.
  - [realtime/socket-server/src/index.js](../realtime/socket-server/src/index.js)
- [DONE] GPS tracker da co Redis Geo lookup va route history.
  - [realtime/socket-server/src/gpsTracker.js](../realtime/socket-server/src/gpsTracker.js)
- [DONE] Strict realtime smoke da pass.
  - [scripts/realtime-e2e-smoke.js](../scripts/realtime-e2e-smoke.js)
- [PARTIAL] Chua co bo SLO benchmark formal de chung minh latency SLA trong production traffic dai han.

## 3) AI Driver Matching
PDF yeu cau: Redis Geo hard filter + AI matching service soft scoring, publish qua Kafka, fallback rule-based.

Repo hien trang:
- [DONE] Da co matching service rieng va da duoc wiring vao booking flow + gateway.
  - [services/matching-service/src/app.js](../services/matching-service/src/app.js)
  - [services/booking-service/src/services/BookingService.js](../services/booking-service/src/services/BookingService.js)
  - [api-gateway/src/app.js](../api-gateway/src/app.js)
- [DONE] Da co fallback recommendation path khi matching/pricing/driver unavailable.
- [DONE] **PHASE 1 (Apr 2026)**: Refactor HTTP → Event-driven Kafka/RabbitMQ pipeline:
  - Booking publishes matching.request event (async, with timeout)
  - Matching service consumer processes requests and publishes matching.response
  - Timeout fallback to HTTP + rule-based matching (dual-mode)
  - Event-driven path uses bulkhead pattern to limit load
  - Comprehensive DLQ handling for failed requests
  - Files: [services/matching-service/src/consumers/matchingConsumer.js](../services/matching-service/src/consumers/matchingConsumer.js)
  - Feature flag: USE_EVENT_DRIVEN_MATCHING (can disable and revert to HTTP-only)
- [DONE] **PHASE 5 (Apr 2026)**: ML lifecycle baseline da co cho pricing model (train/register/validate + artifact registry).
  - [scripts/ml/train-pricing-model.js](../scripts/ml/train-pricing-model.js)
  - [scripts/ml/register-pricing-model.js](../scripts/ml/register-pricing-model.js)
  - [scripts/ci/validate-ml-lifecycle.js](../scripts/ci/validate-ml-lifecycle.js)
  - [models/pricing/registry.json](../models/pricing/registry.json)

## 4) Pricing / Surge pricing
PDF yeu cau: surge pricing (AI) + failure handling (fallback rule, price snapshot theo booking).

Repo hien trang:
- [DONE] Endpoint estimate da su dung pricing engine, co fallback khi model loi.
  - [services/pricing-service/src/app.js](../services/pricing-service/src/app.js)
  - [services/pricing-service/src/ai/pricingEngine.js](../services/pricing-service/src/ai/pricingEngine.js)
- [DONE] Booking luu du lieu snapshot nhu estimatedFare/surge/etaMinutes.
  - [services/booking-service/src/models/Booking.js](../services/booking-service/src/models/Booking.js)
- [PARTIAL] Chua co versioned snapshot contract day du cho toan bo pricing context nhu production-grade ML governance.

## 5) Payment (Saga + Retry/Backoff + Idempotency)
PDF yeu cau: retry + exponential backoff, payment source-of-truth, saga choreography event-driven, idempotency key tranh double-charge.

Repo hien trang:
- [DONE] Da co customer-facing payment APIs, idempotency key handling, confirm endpoint.
  - [services/payment-service/src/app.js](../services/payment-service/src/app.js)
- [DONE] Saga consumer da co va xu ly duplicate theo rideId.
  - [services/payment-service/src/saga/paymentSaga.js](../services/payment-service/src/saga/paymentSaga.js)
- [DONE] **PHASE 3 (Apr 2026)**: Exponential backoff + jitter da duoc harden tren cac payment path quan trong:
  - Booking -> Payment init retry voi retryable-error classifier va backoff policy.
  - Payment model retry scheduling da chuyen sang exponential backoff config-driven.
  - Payment saga RabbitMQ reconnect da su dung exponential backoff + jitter.
  - Files: [shared/utils/retryPolicy.js](../shared/utils/retryPolicy.js), [services/booking-service/src/services/BookingService.js](../services/booking-service/src/services/BookingService.js), [services/payment-service/src/models/Payment.js](../services/payment-service/src/models/Payment.js), [services/payment-service/src/saga/paymentSaga.js](../services/payment-service/src/saga/paymentSaga.js)

## 6) Resilience / Failure handling patterns
PDF yeu cau: circuit breaker, retry/timeout, graceful degradation, bulkhead, idempotency.

Repo hien trang:
- [DONE] Retry/fallback/compensation/idempotency da co trong booking-pricing-payment path.
  - [services/booking-service/src/services/BookingService.js](../services/booking-service/src/services/BookingService.js)
- [DONE] Circuit breaker code co trong gateway router va da expand toan platform.
  - [api-gateway/src/serviceRouter.js](../api-gateway/src/serviceRouter.js)
- [DONE] **PHASE 1 (Apr 2026)**: Bulkhead pattern + DLQ/poison-message policy production-grade da duoc implement:
  - Bulkhead middleware: concurrency limiting, queue management, timeout protection
  - DLQ manager: exponential backoff retry, poison message detection (3+ failures)
  - Event-driven matching: request/response correlation with timeout fallback to HTTP
  - Files: [shared/middleware/bulkhead.js](../shared/middleware/bulkhead.js), [shared/utils/dlqManager.js](../shared/utils/dlqManager.js), [services/booking-service/src/utils/eventDrivenMatcher.js](../services/booking-service/src/utils/eventDrivenMatcher.js), [services/matching-service/src/consumers/matchingConsumer.js](../services/matching-service/src/consumers/matchingConsumer.js)
  - Integration test: [scripts/level4-event-driven-matching.js](../scripts/level4-event-driven-matching.js)
  - Metrics: queue_depth, active_requests, timeouts, poison_messages
  - Feature flags: USE_EVENT_DRIVEN_MATCHING, MATCHING_TIMEOUT_MS

## 7) OpenAPI (FULL all services)
PDF yeu cau: OpenAPI 3.0 full cho all services + import Swagger/Postman.

Repo hien trang:
- [DONE] Da co aggregated OpenAPI snapshot va docs route tren gateway.
  - [docs/openapi/openapi.json](../docs/openapi/openapi.json)
  - [api-gateway/src/app.js](../api-gateway/src/app.js)
- [DONE] **PHASE 3 (Apr 2026)**: Da co generated-per-service OpenAPI tu source code + CI drift check:
  - Generate per-service specs: [scripts/ci/generate-openapi-services.js](../scripts/ci/generate-openapi-services.js)
  - Aggregate metadata source docs + generated artifact: [scripts/ci/generate-openapi.js](../scripts/ci/generate-openapi.js)
  - Validate source-document drift trong CI: [scripts/ci/validate-openapi.js](../scripts/ci/validate-openapi.js)
  - CI integration: [.github/workflows/ci.yml](../.github/workflows/ci.yml), [package.json](../package.json)

## 8) Observability (metrics/logs/tracing)
PDF yeu cau: Prometheus + Grafana, ELK/OpenSearch, Jaeger tracing.

Repo hien trang:
- [DONE] Da co observability compose baseline: Prometheus, Grafana, Jaeger, OpenSearch, OpenSearch Dashboards.
  - [observability/docker-compose.yml](../observability/docker-compose.yml)
- [DONE] Da co gateway metrics endpoint va scrape config.
  - [api-gateway/src/app.js](../api-gateway/src/app.js)
  - [observability/prometheus/prometheus.yml](../observability/prometheus/prometheus.yml)
- [PARTIAL] Da co request-id, trace-id propagation, security headers, metrics endpoint, `/slo` endpoint va observability middleware baseline tren gateway/matching/booking/pricing/eta/review/user/driver/payment/auth/fraud services, nhung full Jaeger span standardization va runtime verification tren cluster van chua dong bo.
- [PARTIAL] Da co Phase 2 smoke script de verify trace metadata + p95/success-rate, va da expose command chay local `npm run smoke:phase2`; van can services dang chay de chot runtime validation.
  - [scripts/phase2-observability-slo-smoke.js](../scripts/phase2-observability-slo-smoke.js)
  - [package.json](../package.json)

## 9) CI/CD + Cloud-native deployment
PDF yeu cau: cloud-native Docker + orchestration + CI/CD.

Repo hien trang:
- [DONE] Docker Compose baseline co.
- [DONE] GitHub Actions workflow co.
  - [.github/workflows/ci.yml](../.github/workflows/ci.yml)
- [DONE] Kubernetes manifests + HPA + kustomize co.
  - [k8s/base/kustomization.yaml](../k8s/base/kustomization.yaml)
- [DONE] Terraform baseline co.
  - [infra/terraform/main.tf](../infra/terraform/main.tf)
- [DONE] **PHASE 5 (Apr 2026)**: Multi-region baseline da co (global routing profile + failover runbook generation).
  - [infra/terraform/multi-region/main.tf](../infra/terraform/multi-region/main.tf)
  - [infra/terraform/multi-region/variables.tf](../infra/terraform/multi-region/variables.tf)
  - [infra/terraform/multi-region/outputs.tf](../infra/terraform/multi-region/outputs.tf)

## 10) Clients (Customer / Driver / Admin)
PDF yeu cau: role flows cho Customer/Driver/Admin.

Repo hien trang:
- [DONE] Customer app co.
- [DONE] **PHASE 4 (Apr 2026)**: Driver operations workflow da duoc mo rong (status/location/update + accept/start/complete/cancel booking + realtime room controls).
  - [clients/driver-app/index.html](../clients/driver-app/index.html)
- [DONE] **PHASE 4 (Apr 2026)**: Admin control room da co service health matrix, telemetry snapshot, alerts va mesh posture quick-check.
  - [clients/admin-dashboard/index.html](../clients/admin-dashboard/index.html)
- [PARTIAL] Driver/Admin da co workflow van hanh cot loi, nhung chua day du nghiep vu enterprise (KYC/earning/fleet governance/tenant).

---

## Current verification snapshot
- [DONE] smoke:level1 da pass.
- [DONE] smoke:realtime:strict da pass.
- [DONE] smoke:phase2 da pass (observability + SLO runtime local validation).
- [DONE] smoke:phase5 da pass (multi-region artifact + ml lifecycle execution).
- [DONE] Matrix smoke/CI gan nhat da xanh toan bo trong local validation run.

## Suggested next priority
1. Hoan thien runtime mesh + WAF/TLS edge enforcement (de dong Security gap con lai).
2. Nang cap observability instrumentation cho tung service (metrics/traces/log schema).
3. Hoan thien enterprise workflows cho driver/admin (KYC, earnings, moderation, fleet policy).
4. Mo rong ML lifecycle sang matching/fraud/eta va bo sung online monitoring.
