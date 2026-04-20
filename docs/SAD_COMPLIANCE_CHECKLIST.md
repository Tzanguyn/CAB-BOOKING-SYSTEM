# CAB Booking System - SAD Compliance Checklist

Ngay cap nhat: 2026-04-19
Muc tieu: doi chieu nhanh giua tai lieu va trang thai thuc te trong repo.

Legend:
- PASS: da co implementation + evidence ro rang trong code va smoke test
- PARTIAL: da co mot phan, nhung chua day du hoac chua production-grade
- GAP: chua co implementation ro rang

## A) Functional

### A1. Passenger flow
- Status: PARTIAL
- Evidence:
	- Auth/register/login/refresh/logout: services/auth-service
	- Booking create/list/detail/context: services/booking-service
	- Pricing/ETA/payment/notification integration da duoc goi tu booking flow
- Gap chinh:
	- Chua co full frontend passenger flow end-to-end
	- Payment contract van con partial o muc customer-facing API

### A2. Driver flow
- Status: PARTIAL
- Evidence:
	- Driver profile/status/location/nearby/recommendation: services/driver-service
	- Realtime driver location update: realtime/socket-server
	- Phase 4 driver console da co luong accept/start/complete/cancel booking + update status/location
- Gap chinh:
	- Chua co full KYC/earning/ride completion flow end-to-end

### A3. Admin flow
- Status: PARTIAL
- Evidence:
	- admin-dashboard da co service health matrix, telemetry snapshot, alerts, mesh posture quick-check
- Gap chinh:
	- Chua co enterprise governance analytics, moderation va tenant-level controls

## B) Non-Functional

### B1. Scalability
- Status: PASS
- Evidence:
	- Kubernetes manifests, HPA va Terraform baseline da co
	- Phase 5 multi-region terraform baseline da co global routing profile + failover runbook generation

### B2. Real-time GPS update
- Status: PASS
- Evidence:
	- Socket.IO server da duoc wire end-to-end
	- GPS tracker, ride room broadcast, ride-service sync, Redis Geo query da co
	- strict realtime smoke da PASS

### B3. Resilience / failure handling
- Status: PARTIAL
- Evidence:
	- Gateway co rate limit + auth middleware
	- Booking co idempotency, retry/fallback, compensation hooks
	- Payment saga va retry metadata co san
- Gap chinh:
	- Circuit breaker chua duoc wired day du vao main gateway path
	- DLQ/poison message handling chua ro rang

### B4. Security / Zero Trust
- Status: PARTIAL
- Evidence:
	- Gateway co JWT validation + rate limit + helmet
	- Gateway da mo rong schema validation cho auth/register-login, booking create, payment create/confirm
	- Gateway da bo sung scope middleware va ABAC body-customer/self-or-admin (che do opt-in bang ENV)
	- RBAC middleware co trong auth-service
	- k8s security manifests co network policy, authz policy, peer auth mTLS
- Gap chinh:
	- Chua co runtime service mesh/mTLS enforcement verified trong cluster
	- Scope enforcement dang o che do opt-in, chua bat buoc toan runtime production

### B5. Observability
- Status: PARTIAL
- Evidence:
	- Da co compose stack cho metrics/logs/tracing va observability middleware baseline
	- Phase 2 observability smoke da pass local (trace metadata + p95/success-rate)
- Gap chinh:
	- Chua co cluster-level tracing/span verification day du theo moi truong production

### B6. Cloud-native + CI/CD
- Status: PASS
- Evidence:
	- Docker Compose co san
	- GitHub Actions workflow co san
	- Kubernetes base manifests co san
	- Terraform baseline co san

## C) Domain / Integration

### C1. Pricing
- Status: PARTIAL
- Evidence:
	- pricing-service khong con la baseFare fixed; co surge/fallback/forecast/recommend-drivers
	- booking-service luu estimatedFare/surge/etaMinutes
- Gap chinh:
	- pricingEngine AI chua duoc dung truc tiep trong endpoint
	- price snapshot theo booking chua duoc dong bo thanh mot flow hoan chinh

### C2. AI driver matching
- Status: PARTIAL
- Evidence:
	- co heuristic recommendation/selection trong pricing-service va driver-service
- Gap chinh:
	- chua co AI matching service dung nghia
	- chua co Kafka-based matching pipeline
	- lifecycle governance cho matching model chua hoan tat

### C5. ML lifecycle governance
- Status: PASS
- Evidence:
	- pricing model lifecycle da co train/register/validate scripts
	- model artifact + registry da duoc quan ly trong repo
	- phase5 smoke da verify duong train -> register -> validate

### C3. Payment
- Status: PASS
- Evidence:
	- payment-service co saga choreography va customer-facing APIs (create/get/confirm)
	- booking-service co idempotency key va compensation flow
	- payment retry/backoff da harden theo exponential backoff + jitter tren booking init, payment model retry scheduling, va broker reconnect

### C4. OpenAPI
- Status: PASS
- Evidence:
	- da co aggregated OpenAPI snapshot cho he thong
	- da co generated OpenAPI theo tung service tu source route
	- da co CI drift check cho x-source-documents va generated artifact

## D) Clients

### D1. Customer app
- Status: PARTIAL
- Evidence:
	- clients/customer-app co implementation
- Gap chinh:
	- can tie cac luong booking/realtime/payment vao E2E UI

### D2. Driver app
- Status: PARTIAL
- Evidence:
	- driver-app da co workflow van hanh: create booking test, accept/start/complete/cancel, update status/location, realtime room
- Gap chinh:
	- chua co full business modules (KYC, earning, settlement)

### D3. Admin dashboard
- Status: PARTIAL
- Evidence:
	- admin-dashboard da co operation board: health matrix, telemetry snapshot, alerts, mesh posture check
- Gap chinh:
	- chua co full governance workflow (policy/audit/fleet moderation)

## E) Current verified snapshot
- PASS: realtime GPS update, cloud-native baseline, CI workflow baseline, scalability baseline, ml lifecycle baseline
- PARTIAL: passenger/driver/business integration, security hardening (cluster mesh runtime), pricing governance, observability cluster rollout, driver app, admin app
- GAP: full AI driver matching, full ABAC/mTLS runtime enforcement tren cluster that

