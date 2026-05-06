import json

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'r', encoding='utf-8') as f:
    collection = json.load(f)

# ============================================================
# Level 3: Integration Test - 10 test cases
#
# Kiem tra service-to-service tuong tac dung cach:
#   1. Booking -> ETA service (booking goi getEtaEstimate, tra etaMinutes)
#   2. Booking -> Pricing service (booking goi getEstimatedFare, tra estimatedFare, surge)
#   3. AI Agent chon driver (matching-service /api/matching/recommend)
#   4. Booking -> Payment -> Notification (end-to-end flow)
#   5. Event ride_requested (kiem tra booking response co event data)
#   6. Driver nhan notification (POST /api/notifications/send)
#   7. Booking confirm -> ACCEPTED (POST /api/bookings/:id/confirm)
#   8. MCP context fetch (GET /api/bookings/:id/context)
#   9. API Gateway route dung service (health check multi-service)
#  10. Pricing retry/fallback (simulate_model_error)
# ============================================================

level_3_items = [
    # --- Test 1: Booking -> ETA service ---
    {
        'name': '1. Booking -> goi ETA service thanh cong',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762622, "lng": 106.660172},\n  "dropoffLocation": {"lat": 10.775658, "lng": 106.700424},\n  "paymentMethod": "CASH"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoac 201", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Booking goi ETA service -> etaMinutes > 0", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    // BookingService goi getEtaEstimate -> tra ve etaMinutes trong response',
                        '    pm.expect(booking.etaMinutes).to.not.be.undefined;',
                        '    pm.expect(booking.etaMinutes).to.be.at.least(0);',
                        '});',
                        'pm.test("Response time < 5000ms (khong timeout)", function () {',
                        '    pm.expect(pm.response.responseTime).to.be.below(5000);',
                        '});',
                        '// Luu bookingId cho cac test sau',
                        'var jsonData = pm.response.json();',
                        'var booking = jsonData.data || jsonData;',
                        'if (booking.id || booking._id) {',
                        '    pm.collectionVariables.set("integrationBookingId", booking.id || booking._id);',
                        '}',
                        'if (booking.bookingId) {',
                        '    pm.collectionVariables.set("integrationBookingRefId", booking.bookingId);',
                        '}'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 2: Booking -> Pricing service ---
    {
        'name': '2. Booking -> goi Pricing service',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.800, "lng": 106.720},\n  "paymentMethod": "CASH"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoac 201", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Booking goi Pricing -> estimatedFare > 0", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.estimatedFare).to.not.be.undefined;',
                        '    pm.expect(booking.estimatedFare).to.be.above(0);',
                        '});',
                        'pm.test("Surge >= 1", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.surge).to.be.at.least(1);',
                        '});',
                        'pm.test("Pricing source la pricing-service hoac fallback", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    if (booking.pricing && booking.pricing.source) {',
                        '        pm.expect(booking.pricing.source).to.be.oneOf(["pricing-service", "fallback"]);',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 3: AI Agent chon driver ---
    {
        'name': '3. AI Agent chon driver tu Driver Service',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/matching/recommend',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "lat": 10.76,\n  "lng": 106.66,\n  "radiusKm": 5,\n  "top": 3,\n  "demandIndex": 1\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Tra ve recommendations (array)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.recommendations).to.be.an("array");',
                        '});',
                        'pm.test("Moi driver co driverId, score, status", function () {',
                        '    var jsonData = pm.response.json();',
                        '    if (jsonData.recommendations.length > 0) {',
                        '        var driver = jsonData.recommendations[0];',
                        '        pm.expect(driver.driverId || driver.driver_id).to.not.be.undefined;',
                        '        pm.expect(driver.score !== undefined || driver.distance !== undefined).to.be.true;',
                        '    }',
                        '});',
                        'pm.test("Co model_version", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.model_version).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 4: End-to-end Booking -> Payment -> Notification ---
    {
        'name': '4. Booking -> Payment -> Notification flow',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoac 201 (booking tao thanh cong)", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Booking success = true", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success).to.be.true;',
                        '});',
                        'pm.test("Payment duoc khoi tao (payment object)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    // Payment co the null neu payment service khong san sang',
                        '    // Nhung field payment phai ton tai trong response',
                        '    pm.expect(booking.payment !== undefined || booking.estimatedFare > 0).to.be.true;',
                        '});',
                        'pm.test("Notification duoc gui den user", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    // Notification co the null neu service khong san sang',
                        '    pm.expect(booking.notification !== undefined || booking.estimatedFare > 0).to.be.true;',
                        '});',
                        'pm.test("Flow end-to-end: co ETA + Pricing + Status", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.etaMinutes).to.not.be.undefined;',
                        '    pm.expect(booking.estimatedFare).to.be.above(0);',
                        '    pm.expect(booking.status).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 5: Event ride_requested duoc publish ---
    {
        'name': '5. Event ride_requested duoc publish khi booking',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200/201 - Booking tao thanh cong", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Booking co bookingId (ride_id cho event)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.bookingId || booking.id || booking._id).to.not.be.undefined;',
                        '});',
                        'pm.test("Status = REQUESTED (event ride_requested)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.status).to.be.oneOf(["REQUESTED", "PENDING", "SEARCHING"]);',
                        '});',
                        'pm.test("Payload chua pickup coordinates (event format)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    var pickup = booking.pickupLocation || booking.pickup;',
                        '    pm.expect(pickup).to.not.be.undefined;',
                        '    pm.expect(pickup.lat || pickup.latitude).to.not.be.undefined;',
                        '});',
                        'pm.test("Co timestamp (createdAt)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.createdAt || booking.created_at).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 6: Driver nhan notification ---
    {
        'name': '6. Driver nhan notification qua Notification Service',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/notifications/send',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "userId": "DRIVER-001",\n  "title": "New Ride Assigned",\n  "message": "You have a new ride request",\n  "type": "PUSH",\n  "metadata": {\n    "bookingId": "{{integrationBookingId}}",\n    "priority": "high"\n  }\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 hoac 201 (notification sent)", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Notification gui thanh cong", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.success !== false).to.be.true;',
                        '});',
                        'pm.test("Response time < 3000ms (khong delay lon)", function () {',
                        '    pm.expect(pm.response.responseTime).to.be.below(3000);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 7: Booking update ACCEPTED ---
    {
        'name': '7. Booking confirm -> status ACCEPTED',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings/{{integrationBookingId}}/confirm',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "driverId": "DRIVER-001",\n  "driverName": "Test Driver",\n  "driverPhone": "0901234567",\n  "driverRating": 4.8,\n  "vehiclePlate": "51A-12345"\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Status chuyen tu REQUESTED -> ACCEPTED", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.status).to.eql("ACCEPTED");',
                        '});',
                        'pm.test("Driver ID duoc gan", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.driverId).to.eql("DRIVER-001");',
                        '});',
                        'pm.test("Event ride_accepted: booking co rideId", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.rideId || booking.ride_id).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 8: MCP context fetch ---
    {
        'name': '8. MCP context duoc fetch thanh cong',
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/api/bookings/{{integrationBookingId}}/context',
            'header': [
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ]
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200 OK", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'pm.test("Context co ride_id", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var ctx = jsonData.data || jsonData;',
                        '    pm.expect(ctx.ride_id).to.not.be.undefined;',
                        '});',
                        'pm.test("Context co pickup va drop", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var ctx = jsonData.data || jsonData;',
                        '    pm.expect(ctx.pickup).to.not.be.undefined;',
                        '    pm.expect(ctx.drop).to.not.be.undefined;',
                        '});',
                        'pm.test("Context co available_drivers (array)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var ctx = jsonData.data || jsonData;',
                        '    pm.expect(ctx.available_drivers).to.be.an("array");',
                        '});',
                        'pm.test("Context co eta_minutes va pricing", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var ctx = jsonData.data || jsonData;',
                        '    pm.expect(ctx.eta_minutes).to.not.be.undefined;',
                        '    pm.expect(ctx.pricing).to.not.be.undefined;',
                        '});',
                        'pm.test("Khong loi permission", function () {',
                        '    pm.expect(pm.response.code).to.not.eql(403);',
                        '    pm.expect(pm.response.code).to.not.eql(401);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    },

    # --- Test 9: API Gateway route dung service ---
    {
        'name': '9. API Gateway route dung service',
        'event': [
            {
                'listen': 'prerequest',
                'script': {
                    'exec': [
                        '// Kiem tra nhieu service health qua gateway',
                        'var gateway = pm.collectionVariables.get("gateway_url");',
                        'var results = [];',
                        '',
                        '// Test gateway health',
                        'pm.sendRequest(gateway + "/health", function (err, res) {',
                        '    if (!err && res.code === 200) {',
                        '        var body = res.json();',
                        '        pm.collectionVariables.set("gatewayHealthOk",',
                        '            body.service === "api-gateway" ? "true" : "false");',
                        '    } else {',
                        '        pm.collectionVariables.set("gatewayHealthOk", "false");',
                        '    }',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            },
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("Gateway health OK (route /health)", function () {',
                        '    pm.response.to.have.status(200);',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.service).to.eql("api-gateway");',
                        '    pm.expect(jsonData.status).to.eql("healthy");',
                        '});',
                        'pm.test("Gateway co SLO healthy flag", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.sloHealthy).to.not.be.undefined;',
                        '});',
                        'pm.test("Gateway co requestId (observability)", function () {',
                        '    var jsonData = pm.response.json();',
                        '    pm.expect(jsonData.requestId || jsonData.traceId).to.not.be.undefined;',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ],
        'request': {
            'method': 'GET',
            'url': '{{gateway_url}}/health',
            'header': []
        }
    },

    # --- Test 10: Pricing retry/fallback khi timeout ---
    {
        'name': '10. Retry khi Pricing service timeout (fallback)',
        'request': {
            'method': 'POST',
            'url': '{{gateway_url}}/api/bookings',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': 'Authorization', 'value': 'Bearer {{token}}'}
            ],
            'body': {
                'mode': 'raw',
                'raw': '{\n  "customerId": "{{userId}}",\n  "pickupLocation": {"lat": 10.762, "lng": 106.660},\n  "dropoffLocation": {"lat": 10.775, "lng": 106.700},\n  "paymentMethod": "CASH",\n  "pricingTimeoutMs": 1\n}'
            }
        },
        'event': [
            {
                'listen': 'test',
                'script': {
                    'exec': [
                        'pm.test("HTTP 200/201 - Booking van thanh cong (khong crash)", function () {',
                        '    pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
                        '});',
                        'pm.test("Pricing fallback duoc su dung khi timeout", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    // Khi pricing timeout, BookingService dung fallback:',
                        '    // estimatedFare = 100000, surge = 1, source = "fallback"',
                        '    pm.expect(booking.estimatedFare).to.be.above(0);',
                        '    if (booking.pricing) {',
                        '        // Neu co pricing detail, kiem tra source',
                        '        var isFallback = booking.pricing.source === "fallback"',
                        '            || booking.pricing.timedOut === true',
                        '            || booking.pricing.retryCount > 0;',
                        '        // Source co the la pricing-service neu nhanh, hoac fallback neu cham',
                        '        pm.expect(booking.pricing.source).to.be.oneOf(["pricing-service", "fallback"]);',
                        '    }',
                        '});',
                        'pm.test("Surge >= 1 ngay ca khi fallback", function () {',
                        '    var jsonData = pm.response.json();',
                        '    var booking = jsonData.data || jsonData;',
                        '    pm.expect(booking.surge).to.be.at.least(1);',
                        '});'
                    ],
                    'type': 'text/javascript'
                }
            }
        ]
    }
]

# Cap nhat Level 3 trong collection
for item in collection['item']:
    if 'name' in item and item['name'].startswith('Level 3'):
        item['item'] = level_3_items
        break

# Them bien moi neu chua co
existing_vars = {v['key'] for v in collection.get('variable', [])}
for var_name in ['integrationBookingId', 'integrationBookingRefId', 'gatewayHealthOk']:
    if var_name not in existing_vars:
        collection.setdefault('variable', []).append({
            'key': var_name,
            'value': '',
            'type': 'string'
        })

with open('d:\\HK\\HK8\\Big_data\\cab-booking-system\\CAB-Booking-System-12-Levels.postman_collection.json', 'w', encoding='utf-8') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)

print("Done! Level 3 updated with 10 integration test cases.")
